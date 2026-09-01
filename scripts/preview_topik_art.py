"""Compare Imagegen sources with their actual 48 px sprites; never alters art."""
from __future__ import annotations

import argparse
import json
import math
import os
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pending', action='store_true', help='Only sprites awaiting final review')
    parser.add_argument('--retained', action='store_true', help='Inspect the existing illustrations kept for TOPIK')
    parser.add_argument('--gallery', action='store_true', help='Show the actual mapped sprites without source images')
    parser.add_argument('--start', type=int, default=0)
    parser.add_argument('--count', type=int, default=12)
    parser.add_argument('--output', default='docs/topik-art-progress.png')
    parser.add_argument('--source-root', type=Path, default=Path.home() / '.codex/generated_images')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'docs/topik-art-manifest.json').read_text(encoding='utf-8'))
    entries = [e for e in manifest['entries'] if e.get('sourceImage')
               and (not args.pending or e.get('status') == 'processed')]
    if args.retained or args.gallery:
        if args.pending:
            parser.error('--retained/--gallery and --pending cannot be combined')
        words = json.loads((ROOT / 'worlds/topik-2.json').read_text(encoding='utf-8'))['level']['words']
        retained = [{**e, 'en': words[e['index']]['en'],
                     'folder': Path(e['file']).parent.name, 'slug': Path(e['file']).stem}
                    for e in manifest['retained']]
        entries = retained if args.retained else retained + [e for e in entries if e.get('reviewed')]
    entries = sorted(entries, key=lambda e: e['index'])[args.start:args.start + args.count]
    if not entries:
        raise SystemExit('No matching images to preview')
    fonts = Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'
    font_path = fonts / 'malgun.ttf'
    if not font_path.exists():
        raise SystemExit('Install a Korean font and point font_path at it before rendering')
    font = ImageFont.truetype(str(font_path), 17)
    small = ImageFont.truetype(str(font_path), 12)
    cell_w, cell_h, columns = (240, 244, 5) if args.gallery else (400, 316, 3)
    canvas = Image.new('RGB', (columns * cell_w, math.ceil(len(entries) / columns) * cell_h), '#f4eddc')
    draw = ImageDraw.Draw(canvas)
    for n, entry in enumerate(entries):
        x, y = (n % columns) * cell_w, (n // columns) * cell_h
        draw.rectangle((x + 5, y + 5, x + cell_w - 6, y + cell_h - 6), fill='#fffaf0', outline='#d5c8ad')
        title = f"{entry['index']:03} {entry['ko']}"
        if args.gallery:
            lines, line = [], ''
            for character in title:
                if line and draw.textlength(line + character, font=font) > 210:
                    lines.append(line)
                    line = ''
                line += character
            lines.append(line)
            title = '\n'.join(lines)
        draw.text((x + 15, y + 10), title, font=font, fill='#30291f')
        sprite = Image.open(ROOT / 'sprites' / entry['folder'] / (entry['slug'] + '.png')).convert('RGBA')
        if args.gallery:
            scale = max(1, min(2, 210 // sprite.width, 100 // sprite.height))
            enlarged = sprite.resize((sprite.width * scale, sprite.height * scale), Image.Resampling.NEAREST)
            canvas.paste(enlarged, (x + (cell_w - enlarged.width) // 2, y + 58), enlarged)
            canvas.paste(sprite, (x + (cell_w - sprite.width) // 2, y + 163), sprite)
            draw.text((x + 15, y + 219), textwrap.shorten(entry['en'], 32, placeholder='…'), font=small, fill='#645844')
            continue
        source = Path(entry['sourceImage']) if entry.get('sourceImage') else ROOT / entry['file']
        if entry.get('sourceImage') and not source.is_absolute():
            source = args.source_root / entry.get('sourceThread', manifest.get('sourceThread', '')) / source
        if source.exists():
            raw = Image.open(source).convert('RGBA')
            raw.thumbnail((184, 208), Image.Resampling.NEAREST)
            canvas.paste(raw, (x + 11 + (184 - raw.width) // 2, y + 44 + (208 - raw.height) // 2), raw)
        else:
            draw.text((x + 15, y + 120), 'Original source unavailable', font=small, fill='#645844')
        scale = max(1, min(3, 180 // sprite.width))
        enlarged = sprite.resize((sprite.width * scale, sprite.height * scale), Image.Resampling.NEAREST)
        canvas.paste(enlarged, (x + 202 + (180 - enlarged.width) // 2, y + 64), enlarged)
        canvas.paste(sprite, (x + 202 + (180 - sprite.width) // 2, y + 216), sprite)
        draw.text((x + 15, y + 272), '\n'.join(textwrap.wrap(entry['en'], 52)[:2]), font=small, fill='#645844')
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)
    print(f'{len(entries)} previewed side by side: {output}')


if __name__ == '__main__':
    main()
