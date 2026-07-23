import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

with open('C:/VibeCode/Hangeul Valley/game.js', 'r', encoding='utf-8') as f:
    text = f.read()

pa_start = text.find('class PixelArtRenderer')
pa_end = text.find('// BaseScene', pa_start)
if pa_end == -1: pa_end = len(text)
pa_text = text[pa_start:pa_end]

# Split pa_text by static method declarations
method_blocks = re.split(r'static\s+', pa_text)

total_keys = 0
all_inventoried_keys = set()

for block in method_blocks:
    if not block.strip(): continue
    lines = block.splitlines()
    header = lines[0]
    m_name = header.split('(')[0].strip()
    
    # Extract keys created in this block
    keys = []
    
    # 1. createTexture(scene, 'key' or "key"
    for k in re.findall(r"createTexture\s*\(\s*scene\s*,\s*['\"]([^'\"]+)['\"]", block):
        keys.append(k)
        all_inventoried_keys.add(k)
        
    # 2. createTexture with dynamic concatenation 'crop_' + name + '_0'
    for k in re.findall(r"createTexture\s*\(\s*scene\s*,\s*['\"]([^'\"]+)['\"]\s*\+", block):
        # find what loops or variations exist
        keys.append(f"{k} [Dynamic Prefix]")
        
    # 3. makeTex('key') or makeTex(`key`)
    for k in re.findall(r"makeTex\s*\(\s*['\"]([^'\"]+)['\"]", block):
        keys.append(k)
        all_inventoried_keys.add(k)
    for k in re.findall(r"makeTex\s*\(\s*`([^`]+)`", block):
        keys.append(k)
        all_inventoried_keys.add(k)

    # 4. makeTile('key')
    for k in re.findall(r"makeTile\s*\(\s*['\"]([^'\"]+)['\"]", block):
        keys.append(k)
        all_inventoried_keys.add(k)

    # 5. generateTexture('key')
    for k in re.findall(r"generateTexture\s*\(\s*['\"]([^'\"]+)['\"]", block):
        keys.append(k)
        all_inventoried_keys.add(k)

    keys = sorted(list(set(keys)))
    if keys:
        print(f"=== {m_name} ({len(keys)} keys) ===")
        for k in keys:
            print("  -", k)
        total_keys += len(keys)

print(f"\nTotal Unique Keys Identified: {len(all_inventoried_keys)}")

