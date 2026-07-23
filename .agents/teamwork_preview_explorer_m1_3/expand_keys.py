import sys
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

with open('C:/VibeCode/Hangeul Valley/game.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect CROPS array in _genCropAndTreeTextures
crop_match = re.search(r'const\s+CROPS\s*=\s*\[(.*?)\];', text, re.DOTALL)
if crop_match:
    print("CROPS definition found:")
    print(crop_match.group(0))

# Let's inspect legacy fallback generateTexture calls
legacy_match = re.search(r'// Fallback procedural texture generation.*?(?=update\(\)|create\(\)|init\(\))', text, re.DOTALL)

