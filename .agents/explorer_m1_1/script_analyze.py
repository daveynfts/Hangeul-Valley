import sys, re, json

sys.stdout.reconfigure(encoding='utf-8')

with open('../../game.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()
print(f"Total lines in game.js: {len(lines)}")

# 1. Search scene definitions
scenes = re.findall(r'class\s+(\w+)\s+extends\s+Phaser\.Scene', text)
print("Phaser.Scene classes:", scenes)

# 2. Search scene.start or scene.launch or scene.switch
print("\nScene transitions:")
for i, line in enumerate(lines):
    if 'scene.start' in line or 'scene.launch' in line or 'scene.switch' in line or 'scene.add' in line:
        print(f"Line {i+1}: {line.strip()}")

# 3. Search all occurrences of gold
print("\nGold occurrences summary:")
gold_matches = []
for i, line in enumerate(lines):
    if 'gold' in line.lower():
        gold_matches.append((i+1, line.strip()))
print(f"Total lines containing 'gold': {len(gold_matches)}")

# Print sample lines where gold is modified or rewarded or spent
print("\nGold modifications (+=, -=, =, gold UI):")
for line_no, line in gold_matches:
    if any(op in line for op in ['gold +=', 'gold -=', 'gold=', 'gold =', 'gold+', 'gold-']):
        print(f"Line {line_no}: {line}")
