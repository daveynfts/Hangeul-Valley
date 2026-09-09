"""Export and review Unit artwork without activating unreviewed candidates."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / 'docs/unit-art-redesign.json'
spec = importlib.util.spec_from_file_location('prop', ROOT / '.grok/skills/farm-pixel-props/scripts/process_prop.py')
prop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prop)

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--end', type=int, default=10000)
    args = parser.parse_args()
    queue = json.loads(QUEUE.read_text(encoding='utf8'))
    entries = [e for e in queue['entries'] if e.get('source') and args.start <= e['index'] < args.end]
    if not entries:
        raise SystemExit('No generated source images in range')
    settings = queue['processing']
    for entry in entries:
        source = ROOT / entry['source']
        output = ROOT / 'docs/unit-art-candidates' / (entry['slug'] + '.png')
        output.parent.mkdir(parents=True, exist_ok=True)
        if not output.exists() or entry.get('processedSourceHash') != digest(source):
            prop.process(source, output, max_h=settings['height'], colors=settings['colors'])
            entry['processedSourceHash'] = digest(source)
            entry['candidate'] = output.relative_to(ROOT).as_posix()
            entry['candidateHash'] = digest(output)
            entry['reviewed'] = False
        with Image.open(output) as im:
            rgba = im.convert('RGBA')
            entry['size'] = list(im.size)
            entry['hasTransparency'] = rgba.getchannel('A').getextrema()[0] == 0
            entry['binaryAlpha'] = set(rgba.getchannel('A').getdata()) <= {0, 255}
    fontfile = Path('C:/Windows/Fonts/malgun.ttf')
    font = ImageFont.truetype(str(fontfile), 15) if fontfile.exists() else ImageFont.load_default()
    small = ImageFont.truetype(str(fontfile), 11) if fontfile.exists() else font
    for offset in range(0, len(entries), 12):
        group = entries[offset:offset + 12]
        page = Image.new('RGB', (1200, ((len(group) + 3) // 4) * 340), '#fff8e9')
        draw = ImageDraw.Draw(page)
        for pos, entry in enumerate(group):
            x, y = (pos % 4) * 300, (pos // 4) * 340
            draw.rectangle((x+2, y+2, x+297, y+337), outline='#c9ac85')
            draw.text((x+10, y+8), str(entry['index']) + ' ' + entry['ko'], fill='#402f21', font=font)
            label = entry['en']
            for line in range(3):
                draw.text((x+10, y+31+line*14), label[line*39:(line+1)*39], fill='#402f21', font=small)
            for file, yy, height in [(entry['source'], y+80, 120), (entry['candidate'], y+210, 118)]:
                with Image.open(ROOT / file) as original:
                    im = original.convert('RGBA')
                    im.thumbnail((276, height), Image.Resampling.NEAREST)
                    page.paste(im, (x+(300-im.width)//2, yy+(height-im.height)//2), im)
            entry['reviewPage'] = 'docs/unit-art-review-' + str(group[0]['index']) + '-' + str(group[-1]['index']) + '.png'
        page.save(ROOT / group[0]['reviewPage'])
    QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'processed': len(entries), 'reviewPages': sorted({e['reviewPage'] for e in entries}),
                      'opaque': [e['index'] for e in entries if not e['hasTransparency']]}))

if __name__ == '__main__':
    main()
