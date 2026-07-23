game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

print("\n--- LINES 200 to 300 ---")
for i in range(200, min(300, len(lines))):
    print(f"{i+1}: {lines[i]}")

