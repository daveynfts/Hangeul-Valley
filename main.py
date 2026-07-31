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
ASSETS    = BASE_DIR                                   # serve directly from root
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
    """Serve files from the assets directory; suppress access logs."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ASSETS, **kwargs)

    def log_message(self, *_):
        pass


def _start_server():
    # Allow address reuse so rapid restarts don't fail
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), _QuietHandler) as httpd:
        httpd.serve_forever()


# ─── Entry point ───────────────────────────────────────────────────────────────
def main():
    # Synchronize root asset files to assets/ directory
    import shutil
    assets_dir = os.path.join(BASE_DIR, 'assets')
    os.makedirs(assets_dir, exist_ok=True)
    for fname in ('game.js', 'index.html', 'levels.json', 'facts.json', 'save_data.json'):
        src = os.path.join(BASE_DIR, fname)
        dst = os.path.join(assets_dir, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
    print("[Sync] Root asset files successfully synchronized to assets/ directory.")

    # Validate asset files
    for fname in ('index.html', 'levels.json', 'facts.json'):
        path = os.path.join(ASSETS, fname)
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
