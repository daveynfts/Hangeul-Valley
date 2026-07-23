import sys, re
sys.stdout.reconfigure(encoding='utf-8')

game_js_path = r'C:/VibeCode/Hangeul Valley/game.js'
with open(game_js_path, 'r', encoding='utf-8') as f:
    code = f.read()

lines = code.splitlines()

# 1. Scope Completeness check
# Farmer frames (21 frames + tools)
farmer_frames = re.findall(r'farmer[a-zA-Z0-9_]*', code)
farmer_frames_created = re.findall(r'createTexture\(scene,\s*[\'\"](farmer[^\'\"]*)[\'\"]', code)
print(f"=== FARMER FRAMES ===")
print(f"Farmer texture keys created ({len(farmer_frames_created)}):")
for k in farmer_frames_created:
    print(f"  - {k}")

# Also check tool textures registered
tool_textures = re.findall(r'createTexture\(scene,\s*[\'\"](tool_[^\'\"]*)[\'\"]', code)
print(f"\nTool texture keys created ({len(tool_textures)}):")
for k in tool_textures:
    print(f"  - {k}")

# Ginger Cat frames (8 frames)
cat_frames = re.findall(r'createTexture\(scene,\s*[\'\"](cat_[^\'\"]*)[\'\"]', code)
print(f"\n=== GINGER CAT FRAMES ===")
print(f"Cat texture keys created ({len(cat_frames)}):")
for k in cat_frames:
    print(f"  - {k}")

# Wizard frames (2 frames)
wiz_frames = re.findall(r'createTexture\(scene,\s*[\'\"](wiz[^\'\"]*|wizard[^\'\"]*)[\'\"]', code)
print(f"\n=== WIZARD FRAMES ===")
print(f"Wizard texture keys created ({len(wiz_frames)}):")
for k in wiz_frames:
    print(f"  - {k}")

# Crops (20 crop growth stages)
crop_frames = re.findall(r'createTexture\(scene,\s*[\'\"](crop_[^\'\"]*|cr_[^\'\"]*)[\'\"]', code)
print(f"\n=== CROP STAGES ===")
print(f"Crop texture keys created ({len(crop_frames)}):")
for k in crop_frames:
    print(f"  - {k}")

# Fish (11 species)
fish_frames = re.findall(r'createTexture\(scene,\s*[\'\"](fish_[^\'\"]*)[\'\"]', code)
print(f"\n=== FISH SPECIES ===")
print(f"Fish texture keys created ({len(fish_frames)}):")
for k in fish_frames:
    print(f"  - {k}")

# Dungeon monsters/bosses
dungeon_frames = re.findall(r'createTexture\(scene,\s*[\'\"](monster_[^\'\"]*|boss_[^\'\"]*|dungeon_[^\'\"]*|slime_[^\'\"]*|goblin_[^\'\"]*|skeleton_[^\'\"]*|bat_[^\'\"]*)[\'\"]', code)
print(f"\n=== DUNGEON MONSTERS/BOSSES ===")
print(f"Dungeon texture keys created ({len(dungeon_frames)}):")
for k in dungeon_frames:
    print(f"  - {k}")

# Arcade ships/enemies
arcade_frames = re.findall(r'createTexture\(scene,\s*[\'\"](arcade_[^\'\"]*|ship_[^\'\"]*|enemy_[^\'\"]*|player_ship[^\'\"]*)[\'\"]', code)
print(f"\n=== ARCADE SPRITES ===")
print(f"Arcade texture keys created ({len(arcade_frames)}):")
for k in arcade_frames:
    print(f"  - {k}")

