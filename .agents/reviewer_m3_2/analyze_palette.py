import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

def find_lines_between(start_str, end_str):
    start_idx = None
    end_idx = None
    for i, l in enumerate(lines):
        if start_str in l and start_idx is None:
            start_idx = i
        elif start_str in l and start_idx is not None and end_idx is None:
            pass # keep first
        if end_str in l and start_idx is not None and i > start_idx:
            end_idx = i
            break
    return start_idx, end_idx

# 1. Palette analysis
p_start, p_end = None, None
for i, l in enumerate(lines):
    if 'PALETTE' in l and '=' in l and '{' in l:
        p_start = i
        break
for i in range(p_start, p_start + 250):
    if lines[i].strip() == '};':
        p_end = i
        break

print("=== PALETTE DEFINITION ===")
for i in range(p_start, p_end + 1):
    print(f"{i+1}: {lines[i]}")

