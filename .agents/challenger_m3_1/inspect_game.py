import re
import hashlib
import os

game_path = r'C:\VibeCode\Hangeul Valley\game.js'
with open(game_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("=== TEXTURE KEY VERIFICATION ===")
textures = [
    'player_water_down_0', 'player_water_down_1', 'player_water_down_2',
    'player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2',
    'player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2',
    'tool_watering_can', 'tool_basket', 'tool_sickle',
    'cat_idle_0', 'cat_idle_1',
    'cat_walk_0', 'cat_walk_1', 'cat_walk_2',
    'cat_sit_0', 'cat_sit_1',
    'cat_sleep_0', 'cat_sleep_1'
]

for t in textures:
    count = content.count(t)
    print(f"Texture key '{t}': {'FOUND' if count > 0 else 'MISSING'} (occurrences: {count})")

print("\n=== ANIMATION KEY & FRAME COUNT VERIFICATION ===")
anims = [
    'player-water', 'player-harvest', 'player-pick',
    'cat-idle', 'cat-walk', 'cat-sit', 'cat-sleep'
]

# Let's inspect where anims.create is called
for anim_key in anims:
    print(f"\n--- Checking anim: {anim_key} ---")
    pos = content.find(f"'{anim_key}'")
    if pos == -1:
        pos = content.find(f'"{anim_key}"')
    if pos != -1:
        # print surrounding text (200 chars)
        start = max(0, pos - 50)
        end = min(len(content), pos + 300)
        print(content[start:end])
    else:
        print("NOT FOUND")
