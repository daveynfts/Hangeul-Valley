import sys, re, json

sys.stdout.reconfigure(encoding='utf-8')

with open('../../game.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()

print("--- Searching Phaser Config ---")
config_match = re.search(r'const config\s*=\s*\{.*?\};', text, re.DOTALL)
if config_match:
    print(config_match.group(0))

print("\n--- Searching Phaser Scene references / keys ---")
for i, line in enumerate(lines):
    if 'key:' in line or 'super(' in line or 'Phaser.Scene' in line or 'scene:' in line:
        print(f"Line {i+1}: {line.strip()}")

print("\n--- Searching Phaser.Game instantiation ---")
for i, line in enumerate(lines):
    if 'new Phaser.Game' in line:
        print(f"Line {i+1}: {line.strip()}")
