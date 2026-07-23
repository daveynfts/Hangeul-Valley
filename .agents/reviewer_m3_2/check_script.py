import re
import json

def run_checks():
    with open('game.js', 'r', encoding='utf-8') as f:
        game_js = f.read()

    with open('index.html', 'r', encoding='utf-8') as f:
        index_html = f.read()

    print("=== CHECKLIST VERIFICATION REPORT ===")

    print("\n--- 1. Farmer Action Animations ---")
    action_frames = [
        "player_water_down_0", "player_water_down_1", "player_water_down_2",
        "player_harvest_down_0", "player_harvest_down_1", "player_harvest_down_2",
        "player_pick_down_0", "player_pick_down_1", "player_pick_down_2"
    ]
    for frame in action_frames:
        found = frame in game_js
        print(f"  Frame '{frame}': {'FOUND' if found else 'MISSING'}")

    anims = ["player-water", "player-harvest", "player-pick"]
    for anim in anims:
        found = anim in game_js
        print(f"  Animation '{anim}': {'FOUND' if found else 'MISSING'}")

    print("\n--- 2. Tool Sprites ---")
    tools = ["tool_watering_can", "tool_basket", "tool_sickle"]
    for tool in tools:
        found = tool in game_js
        print(f"  Texture '{tool}': {'FOUND' if found else 'MISSING'}")

    print("\n--- 3. Ginger Cat Redesign & Renaming ---")
    cat_anims = ["cat-idle", "cat-walk", "cat-sit", "cat-sleep"]
    for anim in cat_anims:
        found = anim in game_js
        print(f"  Cat Animation '{anim}': {'FOUND' if found else 'MISSING'}")

    muop_game = re.findall(r'Muop', game_js, re.IGNORECASE)
    muop_index = re.findall(r'Muop', index_html, re.IGNORECASE)
    print(f"  'Muop' occurrences in game.js: {len(muop_game)} ({muop_game})")
    print(f"  'Muop' occurrences in index.html: {len(muop_index)} ({muop_index})")
    print(f"  'Ginger Cat' occurrences in game.js: {game_js.count('Ginger Cat')}")
    print(f"  'Ginger Cat' occurrences in index.html: {index_html.count('Ginger Cat')}")

    print("\n--- 4. Gameplay Integration & Preservation ---")
    walk_directions = ["down", "up", "left", "right"]
    all_walk_frames = []
    for d in walk_directions:
        for i in range(3):
            all_walk_frames.append(f"player_walk_{d}_{i}")
    
    missing_walk = [f for f in all_walk_frames if f not in game_js]
    print(f"  Farmer 12 walk cycle frames missing: {missing_walk}")

    cat_ai_found = "_updateCatNPC" in game_js
    print(f"  '_updateCatNPC' in game.js: {'FOUND' if cat_ai_found else 'MISSING'}")

if __name__ == "__main__":
    run_checks()
