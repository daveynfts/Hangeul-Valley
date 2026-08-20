"""
Hangeul Valley – Desktop Wrapper
Uses PyWebView to host the Phaser 3 HTML5 game as a native Windows window.
100% offline – no backend API routes needed.

Run with:
    python main.py
    -- or --
    double-click run.bat
"""

import os
import sys
import json
import threading
import http.server
import socketserver

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
        try:
            with self._lock:
                with open(SAVE_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
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
                with open(SAVE_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            print(f"[Load] Game loaded <- {SAVE_FILE}")
            return data
        except Exception as e:
            print(f"[Load ERROR] {e}")
            return None


# ─── Minimal local HTTP server ──────────────────────────────────────────────────
class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files from the repo root; suppress access logs."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def log_message(self, *_):
        pass


def _start_server():
    # Allow address reuse so rapid restarts don't fail
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), _QuietHandler) as httpd:
        httpd.serve_forever()


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

    # Start HTTP server in background thread
    threading.Thread(target=_start_server, daemon=True).start()
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
