import sys, re, json

sys.stdout.reconfigure(encoding='utf-8')

with open('../../game.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()

print("=== 1. ALL CURRENCY / GOLD USAGES IN GAME.JS ===")
for i, line in enumerate(lines):
    if any(term in line.lower() for term in ['gold', 'coin', 'gem', 'honor', 'reward', 'cost', 'spend', 'level_cost']):
        print(f"Line {i+1:4d}: {line.strip()}")

print("\n=== 2. DIMINISHING RETURNS & REWARD FORMULAS ===")
for i, line in enumerate(lines):
    if any(term in line for term in ['LEVEL_COST', 'harvest', 'harvests', 'diminish', 'Math.pow', 'Math.floor', 'reward', 'min 3', 'calc']):
        print(f"Line {i+1:4d}: {line.strip()}")
