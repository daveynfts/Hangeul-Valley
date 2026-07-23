import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('game.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'ginger cat' in line.lower():
            print(f"game.js:{i}: {line.strip()[:100]}")

with open('index.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'ginger cat' in line.lower() or 'ginger' in line.lower():
            print(f"index.html:{i}: {line.strip()[:100]}")
