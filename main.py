"""
Hangeul Valley – Desktop Wrapper
Uses PyWebView to host the Phaser 3 HTML5 game as a native Windows window.

Offline: Phaser is vendored (vendor/phaser-3.70.0.min.js), so nothing is fetched over the
network to start the game, and no third-party script is loaded at all. There is no cloud
save here: it lives behind /api/save, which only the Vercel deployment serves. The file
save below is what persists progress on this machine.

Run with:
    python main.py
    -- or --
    double-click run.bat
"""

import os
import sys
import json
import time
import posixpath
import tempfile
import threading
import http.server
import socketserver
import urllib.parse

# ── Try to import webview; give a friendly install hint if missing ──────────────
try:
    import webview
except ImportError:
    print("[ERROR] pywebview is not installed.")
    print("Install it with:  python -m pip install pywebview")
    sys.exit(1)


# ─── Constants ─────────────────────────────────────────────────────────────────
PORT      = 8742
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
SERVE_DIR = BASE_DIR                                   # game files live at repo root
SAVE_FILE = os.path.join(BASE_DIR, 'save_data.json')   # persistent save file
DATA_DIR  = os.path.join(BASE_DIR, 'webview_data')     # WebView2 user profile

# The game files sit at the repo root, next to .env.local, save_data.json, .git/ and the
# WebView2 profile. Serving the root wholesale published all of that on 127.0.0.1:8742 —
# and because index.html pulls in a third-party script, anything running in the page's
# origin could read it. So the handler serves an allowlist instead of a directory: these
# entries and nothing else. Adding a new content folder means adding it here.
ALLOWED_FILES = frozenset({
    'index.html',
    'levels.json',
    'facts.json',
})
ALLOWED_DIRS = frozenset({
    'css',
    'js',
    'vendor',
    'sprites',
    'audio',
    'skins',
    'worlds',
    # The translation catalogues (locales/<lang>/levels.json, locales/<lang>/worlds/...). Left
    # off this list, every one of them 404'd, and the desktop build showed level names, glosses
    # and whole units in English under the Vietnamese interface with nothing saying why.
    # tests/test_desktop_allowlist.js checks this list against every folder vercel.json serves.
    'locales',
})

os.makedirs(DATA_DIR, exist_ok=True)

# Tell Edge WebView2 to use our folder so localStorage persists between sessions
os.environ.setdefault('WEBVIEW2_USER_DATA_FOLDER', DATA_DIR)


# ─── File-based Save API (exposed to JavaScript via pywebview) ──────────────────
class GameSaveAPI:
    """
    JS calls:  await window.pywebview.api.save(data)
               await window.pywebview.api.load()
    Data is a plain JSON-serialisable dict mirroring the full game state.
    """
    _lock = threading.Lock()

    def save(self, data: dict) -> bool:
        # Write a temp file in the same directory and rename it over the target. Opening
        # SAVE_FILE with 'w' truncates it first, so a crash or a power cut between the
        # truncate and the last flush left a zero-length or half-written save — the game
        # would then start fresh. os.replace is atomic on both NTFS and POSIX.
        try:
            with self._lock:
                fd, tmp = tempfile.mkstemp(
                    dir=os.path.dirname(SAVE_FILE),
                    prefix='.save_data-',
                    suffix='.tmp',
                )
                try:
                    with os.fdopen(fd, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                        f.flush()
                        os.fsync(f.fileno())
                    os.replace(tmp, SAVE_FILE)
                except BaseException:
                    # Never leave the temp file behind, and never touch the good save.
                    try:
                        os.unlink(tmp)
                    except OSError:
                        pass
                    raise
            print(f"[Save] Game saved -> {SAVE_FILE}")
            return True
        except Exception as e:
            print(f"[Save ERROR] {e}")
            return False

    def load(self):
        try:
            with self._lock:
                if not os.path.exists(SAVE_FILE):
                    return None
                try:
                    with open(SAVE_FILE, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except (ValueError, UnicodeDecodeError) as e:
                    # A save that will not parse is set aside, not left to be overwritten. The
                    # game starts from localStorage (or fresh) when this returns None, and its
                    # first save would replace the only copy of whatever the file still held.
                    aside = SAVE_FILE + '.corrupt-' + time.strftime('%Y%m%d-%H%M%S')
                    os.replace(SAVE_FILE, aside)
                    print(f"[Load ERROR] {SAVE_FILE} could not be read ({e}); kept as {aside}")
                    return None
            print(f"[Load] Game loaded <- {SAVE_FILE}")
            return data
        except Exception as e:
            print(f"[Load ERROR] {e}")
            return None


# ─── Minimal local HTTP server ──────────────────────────────────────────────────
def _is_game_path(rel: str) -> bool:
    """True only for paths that belong to the game (see ALLOWED_FILES / ALLOWED_DIRS)."""
    if not rel:
        return False
    parts = rel.split('/')
    # No traversal, no dotfiles — '.env.local', '.git/config' and friends stop here even
    # if a future edit adds their parent to the allowlist.
    if any(p in ('', '.', '..') or p.startswith('.') for p in parts):
        return False
    if rel in ALLOWED_FILES:
        return True
    return parts[0] in ALLOWED_DIRS


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Serve the allowlisted game files from the repo root; suppress access logs."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def log_message(self, *_):
        pass

    def _rel_path(self) -> str:
        """The request path as a normalised repo-relative path ('' for the root)."""
        raw = urllib.parse.urlsplit(self.path).path
        raw = urllib.parse.unquote(raw)
        rel = posixpath.normpath(raw).lstrip('/')
        return '' if rel in ('.', '/') else rel

    def _serve_config(self) -> None:
        """
        Stand in for the Vercel /api/config function.

        initGoogleAuth() fetches this on boot to learn the Google client id. On desktop
        there is no serverless runtime, so the request 404'd and logged an error on every
        launch. Answering it here keeps the console clean.

        It answers with no client id, always. It used to pass GOOGLE_CLIENT_ID through "so
        cloud save can work from the desktop build too", but cloud save is /api/save and
        /api/session, which this server does not have: a player who signed in here got a
        sign-in that worked and uploads that 404'd, with the chip saying "not synced" for
        ever. No client id means no sign-in button, which is the truth about this build.
        """
        body = json.dumps({'googleClientId': '', 'cloudSave': False}).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def _guard(self) -> bool:
        """Answer the request here if it is not a plain game file. True == handled."""
        rel = self._rel_path()
        if rel == 'api/config':
            self._serve_config()
            return True
        if rel == '':
            rel = 'index.html'
            self.path = '/index.html'
        if not _is_game_path(rel):
            self.send_error(404, 'Not Found')
            return True
        return False

    def do_GET(self):
        if not self._guard():
            super().do_GET()

    def do_HEAD(self):
        if not self._guard():
            super().do_HEAD()


class _GameServer(socketserver.TCPServer):
    # SO_REUSEADDR is what lets a quick restart rebind a port still in TIME_WAIT on POSIX. On
    # Windows it means something else: a second socket may bind a port that is already
    # *listening*. With it on, a second copy of the game — or anything else on 8742 — shared
    # the port instead of failing, and the window loaded whichever server the OS picked.
    allow_reuse_address = os.name != 'nt'


def _make_server(port=PORT):
    """Bound before the window opens, so a port in use is an error the player can read."""
    return _GameServer(('127.0.0.1', port), _QuietHandler)


# ─── Entry point ───────────────────────────────────────────────────────────────
def main():
    required = (
        'index.html',
        os.path.join('css', 'game.css'),
        os.path.join('js', 'manifest.json'),
        os.path.join('js', 'state.js'),
        'levels.json',
        'facts.json',
    )
    for fname in required:
        path = os.path.join(SERVE_DIR, fname)
        if not os.path.exists(path):
            print(f"[ERROR] Missing file: {path}")
            sys.exit(1)

    # Bound here rather than inside the thread. A failed bind in the thread used to kill only
    # the thread, silently, and the window then opened on whatever else was answering 8742 —
    # a second copy of the game, or a dev server serving the whole repo root.
    try:
        httpd = _make_server()
    except OSError as e:
        print(f"[ERROR] Port {PORT} is already in use ({e}).")
        print("        Close the other copy of Hangeul Valley, or whatever is using the port, and start again.")
        sys.exit(1)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"[Hangeul Valley] Server -> http://127.0.0.1:{PORT}")
    if os.path.exists(SAVE_FILE):
        print(f"[Hangeul Valley] Save file found: {SAVE_FILE}")
    else:
        print("[Hangeul Valley] No save file yet — fresh start.")

    url = f'http://127.0.0.1:{PORT}/index.html'
    webview.create_window(
        title       = 'Hangeul Valley – Level Mode 🌾',
        url         = url,
        js_api      = GameSaveAPI(),   # ← exposes save/load to JavaScript
        width       = 1280,
        height      = 720,
        min_size    = (800, 600),
        resizable   = True,
        text_select = False,
        fullscreen  = True,
    )
    webview.start(debug=False)
    print("[Hangeul Valley] Game closed. Goodbye!")


if __name__ == '__main__':
    main()
