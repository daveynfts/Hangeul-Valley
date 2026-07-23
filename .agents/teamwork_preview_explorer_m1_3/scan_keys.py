import sys
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

with open('C:/VibeCode/Hangeul Valley/game.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()

# Parse PixelArtRenderer class
pa_start = text.find('class PixelArtRenderer')
# find class end or next top-level class/comment
pa_end = text.find('\nclass ', pa_start + 10)
if pa_end == -1:
    pa_end = len(text)

pa_text = text[pa_start:pa_end]

print("=== METHOD BREAKDOWN IN PIXELARTRENDERER ===")

# Find all methods and their ranges in PixelArtRenderer
method_matches = list(re.finditer(r"static\s+([_a-zA-Z0-9]+)\s*\([^)]*\)\s*\{", pa_text))

for idx, match in enumerate(method_matches):
    m_name = match.group(1)
    m_start = match.start()
    m_end = method_matches[idx+1].start() if idx+1 < len(method_matches) else len(pa_text)
    m_body = pa_text[m_start:m_end]

    # Find literal and template keys in m_body
    keys_literal = re.findall(r"(?:createTexture|makeTex|makeTile|\.generateTexture)\s*\(\s*(?:scene\s*,\s*)?['\"]([^'\"]+)['\"]", m_body)
    keys_template = re.findall(r"(?:createTexture|makeTex|makeTile|\.generateTexture)\s*\(\s*(?:scene\s*,\s*)?`([^`]+)`", m_body)

    print(f"\n--- Method: {m_name} ---")
    print("  Keys (literal):", keys_literal)
    print("  Keys (template):", keys_template)
    
    # Print excerpt of keys/loops if template or special
    for line in m_body.splitlines():
        if any(k in line for k in ['createTexture', 'makeTex', 'makeTile', 'generateTexture', 'create(']):
            print("    Line:", line.strip())

print("\n=== EXTERNAL TEXTURE GENERATION IN GAME.JS (OUTSIDE PIXELARTRENDERER) ===")
ext_text = text[:pa_start] + text[pa_end:]
ext_gen = re.findall(r"\.generateTexture\s*\(\s*['\"]([^'\"]+)['\"]", ext_text)
ext_gen_temp = re.findall(r"\.generateTexture\s*\(\s*`([^`]+)`", ext_text)

print("External generateTexture (literal):", sorted(list(set(ext_gen))))
print("External generateTexture (template):", sorted(list(set(ext_gen_temp))))

