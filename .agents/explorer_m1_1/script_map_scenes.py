import sys, re, json

sys.stdout.reconfigure(encoding='utf-8')

with open('../../game.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()

def find_range(start_pat, end_pat):
    start, end = -1, len(lines)
    for i, line in enumerate(lines):
        if re.search(start_pat, line) and start == -1:
            start = i
        elif start != -1 and re.search(end_pat, line):
            end = i
            break
    return start, end

print("=== 1. FarmScene (lines 989 to 2208) ===")
farm_gold = []
for i in range(988, 2208):
    if any(k in lines[i].lower() for k in ['gold', 'reward', 'cost', 'harvest', 'apple']):
        farm_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in FarmScene: {len(farm_gold)}")
for line in farm_gold[:20]:
    print("  ", line)

print("\n=== 2. ArcadeScene (lines 2209 to 2593) ===")
arcade_gold = []
for i in range(2208, 2593):
    if any(k in lines[i].lower() for k in ['gold', 'reward', 'earned', 'score']):
        arcade_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in ArcadeScene: {len(arcade_gold)}")
for line in arcade_gold:
    print("  ", line)

print("\n=== 3. DungeonScene (lines 2594 to 2886) ===")
dungeon_gold = []
for i in range(2593, 2886):
    if any(k in lines[i].lower() for k in ['gold', 'reward', 'loot', 'monster']):
        dungeon_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in DungeonScene: {len(dungeon_gold)}")
for line in dungeon_gold:
    print("  ", line)

print("\n=== 4. FishingScene (lines 2887 to 3212) ===")
fishing_gold = []
for i in range(2886, 3212):
    if any(k in lines[i].lower() for k in ['gold', 'reward', 'catch', 'fish']):
        fishing_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in FishingScene: {len(fishing_gold)}")
for line in fishing_gold:
    print("  ", line)

print("\n=== 5. Memory Minigame (lines 3213 to 3315) ===")
memory_gold = []
for i in range(3212, 3315):
    if any(k in lines[i].lower() for k in ['gold', 'reward', 'flips']):
        memory_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in Memory Minigame: {len(memory_gold)}")
for line in memory_gold:
    print("  ", line)

print("\n=== 6. Trophies & Shop (lines 3316 to 3390, and lines 727 to 787) ===")
shop_gold = []
for i in list(range(726, 787)) + list(range(3315, 3390)):
    if any(k in lines[i].lower() for k in ['gold', 'cost', 'buy', 'trophy', 'level_cost']):
        shop_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in Shop & Trophies: {len(shop_gold)}")
for line in shop_gold:
    print("  ", line)

print("\n=== 7. Spell Quiz Duel (lines 3391 to 3633) ===")
duel_gold = []
for i in range(3390, len(lines)):
    if any(k in lines[i].lower() for k in ['gold', 'reward', 'bonus', 'enemy', 'victory']):
        duel_gold.append(f"Line {i+1:4d}: {lines[i].strip()}")
print(f"Total relevant lines in Spell Quiz Duel: {len(duel_gold)}")
for line in duel_gold:
    print("  ", line)
