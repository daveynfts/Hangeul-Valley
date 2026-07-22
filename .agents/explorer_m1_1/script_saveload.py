import sys, re, json

sys.stdout.reconfigure(encoding='utf-8')

with open('../../game.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()

print("=== SAVE / LOAD LOGIC IN GAME.JS ===")
for i, line in enumerate(lines):
    if any(k in line for k in ['collectSave', 'applySave', 'persistSave', 'initSave', 'loadSave', 'pywebview', 'localStorage', 'save_data']):
        print(f"Line {i+1:4d}: {line.strip()}")
