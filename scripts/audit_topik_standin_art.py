"""Read-only checks for TOPIK source transparency and production PNG quality."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

from PIL import Image
from process_topik_standin_art import processor


ROOT = Path(__file__).resolve().parents[1]


def has_baked_checker(image: Image.Image) -> bool:
    """Detect the bright alternating rows left by a partially clipped checkerboard."""
    rgba = image.convert('RGBA')
    bounds = rgba.getchannel('A').getbbox()
    if not bounds:
        return False
    cropped = rgba.crop(bounds)
    # A genuine pixel-art object may contain plenty of white paper, but its top
    # edge will not alternate repeatedly between two neutral matte shades.
    for y in range(min(32, cropped.height)):
        bins: list[int] = []
        neutral = 0
        for x in range(cropped.width):
            r, g, b, a = cropped.getpixel((x, y))
            if a == 255 and r > 220 and max(r, g, b) - min(r, g, b) <= 12:
                neutral += 1
                bins.append(1 if (r + g + b) // 3 >= 248 else 0)
            else:
                bins.append(-1)
        if neutral < cropped.width * 0.8:
            continue
        visible = [value for value in bins if value >= 0]
        if sum(a != b for a, b in zip(visible, visible[1:])) >= 4:
            return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-complete', action='store_true')
    parser.add_argument('--output', default='.codex-topik-quality.json')
    parser.add_argument('--source-root', type=Path, default=Path.home() / '.codex/generated_images')
    args = parser.parse_args()
    queue = json.loads((ROOT / 'docs/topik-standin-art-queue.json').read_text(encoding='utf-8'))
    cache_file = ROOT / '.codex-topik-processing-cache.json'
    cache = json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {}
    issues: list[dict] = []
    hashes: dict[str, int] = {}
    pixel_hashes: dict[str, int] = {}
    generated = 0
    reviewed = 0
    for entry in queue['entries']:
        def issue(kind: str, detail: str) -> None:
            issues.append({'index': entry['index'], 'ko': entry['ko'], 'kind': kind, 'detail': detail})

        if not entry.get('sourceImage'):
            if args.require_complete:
                issue('not-generated', 'No dedicated source yet')
            continue
        generated += 1
        source = args.source_root / entry['sourceThread'] / entry['sourceImage']
        if not source.is_file():
            issue('missing-source', str(source))
            continue
        with Image.open(source) as original:
            alpha = original.convert('RGBA').getchannel('A')
            if alpha.getextrema()[0] == 255 and not entry.get('keyMagenta'):
                issue('opaque-source', 'No transparent pixels; inspect for a baked background')
            elif has_baked_checker(original):
                issue('checker-source', 'A partially clipped checkerboard remains in the source')
        sprite_path = ROOT / 'sprites' / entry['folder'] / (entry['slug'] + '.png')
        if not sprite_path.is_file():
            issue('not-processed', str(sprite_path))
            continue
        data = sprite_path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        processed = cache.get(entry['slug'], {})
        expected_spec = {'sourceHash': hashlib.sha256(source.read_bytes()).hexdigest(),
                         'height': queue['outputHeight'], 'colors': 32,
                         'keyMagenta': bool(entry.get('keyMagenta'))}
        if processed.get('spec') != expected_spec or processed.get('spriteHash') != digest:
            issue('outdated-export', 'Re-export this exact source with process_topik_standin_art.py')
        if digest in hashes:
            issue('duplicate-png', 'Same PNG bytes as index ' + str(hashes[digest]))
        hashes[digest] = entry['index']
        with Image.open(sprite_path) as sprite:
            if sprite.format != 'PNG' or sprite.height != queue['outputHeight']:
                issue('wrong-size', str(sprite.size))
            rgba = sprite.convert('RGBA')
            colors = rgba.getcolors(rgba.width * rgba.height) or []
            opaque_colors = {color[:3] for _, color in colors if color[3]}
            alphas = {color[3] for _, color in colors}
            if alphas != {0, 255}:
                issue('alpha', 'Expected a nonempty cutout with binary alpha: ' + str(sorted(alphas)))
            if len(opaque_colors) > 32:
                issue('palette', str(len(opaque_colors)) + ' visible colors')
            if any(processor.is_key_color(*color) for _, color in colors):
                issue('matte-islands', 'Reserved magenta remains in the visible sprite')
            bounds = rgba.getchannel('A').getbbox()
            # The shared processor aligns feet with the last canvas row; its
            # padding is applied before resizing, not as a final 2 px border.
            if not bounds or bounds[3] != rgba.height:
                issue('baseline', 'Expected a visible cutout aligned to the bottom of the canvas')
            if bounds:
                cropped = rgba.crop(bounds)
                # Match the repository regression check: compression, metadata,
                # empty padding and invisible RGB values cannot hide duplicates.
                pixels = bytearray(cropped.tobytes())
                for offset in range(0, len(pixels), 4):
                    if pixels[offset + 3] == 0:
                        pixels[offset:offset + 4] = b'\0\0\0\0'
                pixel_digest = hashlib.sha256(str(cropped.size).encode('ascii') + bytes(pixels)).hexdigest()
                if pixel_digest in pixel_hashes:
                    issue('duplicate-pixels', 'Same visible pixels as index ' + str(pixel_hashes[pixel_digest]))
                pixel_hashes[pixel_digest] = entry['index']
        if (entry.get('reviewed') is True and entry.get('rawReviewed') is True
                and entry.get('reviewedSourceImage') == entry['sourceImage']
                and entry.get('reviewedHash') == digest):
            reviewed += 1
        elif args.require_complete:
            issue('not-reviewed', 'Current source and processed PNG have not passed visual review')
    report = {'total': len(queue['entries']), 'generated': generated, 'reviewed': reviewed,
              'issueCounts': dict(Counter(item['kind'] for item in issues)), 'issues': issues}
    (ROOT / args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'issues'}, ensure_ascii=False))
    if args.require_complete and issues:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
