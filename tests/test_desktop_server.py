"""
tests/test_desktop_server.py — the desktop wrapper's HTTP surface and save durability.

main.py used to hand the whole repo root to SimpleHTTPRequestHandler, so
http://127.0.0.1:8742/.env.local returned the live R2 and Cloudflare credentials, and
save_data.json, .git/config and the WebView2 profile were readable too. index.html loads a
script into that same origin, so anything running there could read all of it.

This suite pins the replacement: an allowlist, not a directory. It also covers the atomic
save write, since the old open(path, 'w') truncated the real save before writing it.

Run: python tests/test_desktop_server.py   (or: npm run test:desktop)
"""

import json
import os
import socketserver
import sys
import threading
import types
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

# main.py exits if pywebview is missing, and CI has no reason to install a GUI toolkit.
# Only the import has to succeed — nothing here touches webview itself.
sys.modules.setdefault('webview', types.ModuleType('webview'))

import main  # noqa: E402

passed = 0
failed = 0


def check(cond, msg):
    global passed, failed
    if cond:
        print('  [PASS] ' + msg)
        passed += 1
    else:
        print('  [FAIL] ' + msg)
        failed += 1


def status_of(port, path):
    # Read the body before closing. Dropping the connection mid-response — levels.json and
    # the Phaser bundle are large enough for that to happen — makes socketserver print a
    # ConnectionAborted traceback that has nothing to do with the assertion.
    try:
        with urllib.request.urlopen('http://127.0.0.1:%d%s' % (port, path), timeout=10) as r:
            r.read()
            return r.status
    except urllib.error.HTTPError as e:
        e.read()
        return e.code


# ── 1. What the desktop server will and will not serve ───────────────────────
print('\n--- 1. Web root is an allowlist, not a directory ---')

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(('127.0.0.1', 0), main._QuietHandler)
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()

# Written into the repo root for the duration of the test: the files that matter most are
# gitignored, so on a clean checkout there would be nothing to prove.
planted = []
for name, body in [('.env.local', 'R2_SECRET_ACCESS_KEY=must-not-be-served\n'),
                   ('save_data.json', '{"probe":"must-not-be-served"}')]:
    p = os.path.join(ROOT, name)
    if not os.path.exists(p):
        with open(p, 'w', encoding='utf-8') as f:
            f.write(body)
        planted.append(p)

try:
    must_block = [
        '/.env.local',            # live R2 / Cloudflare credentials
        '/.env.example',
        '/save_data.json',        # the player's progress
        '/.git/config',           # remote URL, and any credential helper config
        '/.git/HEAD',
        '/webview_data/',         # WebView2 profile: cookies, localStorage
        '/.vercel/project.json',
        '/package.json',
        '/main.py',
        '/README.md',
        '/admin/server.js',
        '/api/save.js',
        '/scripts/publish.js',
        '/tests/test_desktop_server.py',
        '/js/../.env.local',      # traversal, spelled plainly
        '/%2e%2e/.env.local',     # and percent-encoded
        '/./.env.local',
    ]
    for path in must_block:
        check(status_of(PORT, path) == 404, 'blocked: ' + path)

    must_serve = [
        '/index.html',
        '/',                      # root resolves to index.html
        '/levels.json',
        '/facts.json',
        '/css/game.css',
        '/js/manifest.json',
        '/js/boot.js',
        '/js/systems/save.js',
        '/vendor/phaser-3.70.0.min.js',   # vendored so the desktop build runs offline
        '/diner/index.html',
        '/worlds/2b-unit-10.json',
        '/skins/catalog.json',
    ]
    for path in must_serve:
        check(status_of(PORT, path) == 200, 'served: ' + path)

    # Every script index.html asks for has to be reachable, or the allowlist silently
    # breaks the game the next time a folder is added.
    import re
    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        html = f.read()
    local_srcs = [s for s in re.findall(r'<script src="([^"]+)"', html) if '://' not in s]
    check(len(local_srcs) > 0, 'index.html lists local scripts to check')
    unreachable = [s for s in local_srcs if status_of(PORT, '/' + s.lstrip('/')) != 200]
    check(not unreachable, 'every local <script> in index.html is served: ' + str(unreachable))

    # No third-party script tag should remain in the page.
    remote_srcs = re.findall(r'<script src="(https?://[^"]+)"', html)
    check(not remote_srcs, 'index.html loads no third-party script: ' + str(remote_srcs))

    print('\n--- 2. /api/config answers instead of 404ing ---')
    with urllib.request.urlopen('http://127.0.0.1:%d/api/config' % PORT, timeout=10) as r:
        cfg = json.loads(r.read().decode('utf-8'))
        check(r.status == 200, '/api/config returns 200, so boot logs no console error')
        check('googleClientId' in cfg, 'and it carries a googleClientId field')
finally:
    httpd.shutdown()
    for p in planted:
        try:
            os.unlink(p)
        except OSError:
            pass

# ── 3. The save file is replaced atomically ──────────────────────────────────
print('\n--- 3. Saving cannot truncate a good save ---')

import tempfile  # noqa: E402

with tempfile.TemporaryDirectory() as tmp:
    target = os.path.join(tmp, 'save_data.json')
    real_save_file = main.SAVE_FILE
    main.SAVE_FILE = target
    try:
        api = main.GameSaveAPI()
        payload = {'v': 9, 'currencies': {'coins': 4242}, 'updatedAt': 1700000000000}
        check(api.save(payload) is True, 'save reports success')
        check(api.load() == payload, 'and the data round-trips through the file')

        # A failing serialise must leave the previous save untouched, which the old
        # open(..., "w") could not promise: it truncated first and raised second.
        class Unserialisable:
            pass

        check(api.save({'bad': Unserialisable()}) is False, 'an unserialisable save fails cleanly')
        check(api.load() == payload, 'and the previous good save is still intact')
        leftovers = [f for f in os.listdir(tmp) if f.startswith('.save_data-')]
        check(not leftovers, 'no temp files are left behind: ' + str(leftovers))
    finally:
        main.SAVE_FILE = real_save_file

# ── 4. The allowlist predicate itself ────────────────────────────────────────
print('\n--- 4. _is_game_path ---')
for rel in ['index.html', 'js/boot.js', 'vendor/phaser-3.70.0.min.js', 'sprites/ui/gold_coin.png']:
    check(main._is_game_path(rel) is True, 'allows ' + rel)
for rel in ['.env.local', 'js/.env.local', '.git/config', 'webview_data/x', 'main.py',
            'api/save.js', '', '..', '../secret', 'js/../.env.local']:
    check(main._is_game_path(rel) is False, 'rejects ' + repr(rel))

print('\n%d passed, %d failed' % (passed, failed))
sys.exit(0 if failed == 0 else 1)
