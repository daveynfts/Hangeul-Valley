import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

# Search for methods starting with _gen in PixelArtRenderer
methods = []
current_method = None
method_start = 0

for i, l in enumerate(lines):
    m = re.match(r'^\s*static\s+(_gen\w+)\s*\(', l)
    if m:
        methods.append((m.group(1), i+1))

print("Found generation methods:")
for name, line_num in methods:
    print(f"  - {name} at line {line_num}")

