"""Key magenta, crop to feet, resize, write sprites/ + assets/sprites/."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image


def key_magenta(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # Magenta / rose key used by Imagine (#FF00FF and #C62090-class fills).
            rose = g < 90 and r > 160 and b > 100 and r > g + 70
            hot = r >= 170 and b >= 150 and g <= 170 and (r + b) - 2 * g > 40
            if rose or hot:
                px[x, y] = (0, 0, 0, 0)
    return im


def process(src: Path, dest: Path, max_h: int = 156, pad: int = 2) -> None:
    im = key_magenta(Image.open(src))
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit(f"empty after key: {src}")
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    im = im.crop((l, t, r, b))
    nw = max(8, int(round(im.width * (max_h / im.height))))
    im = im.resize((nw, max_h), Image.Resampling.LANCZOS)
    im = key_magenta(im)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("name", help="basename without extension, e.g. study_desk")
    p.add_argument("--root", default=".")
    p.add_argument("--height", type=int, default=156)
    args = p.parse_args()
    root = Path(args.root)
    dest = root / "sprites" / f"{args.name}.png"
    process(Path(args.src), dest, max_h=args.height)
    mirror = root / "assets" / "sprites" / f"{args.name}.png"
    mirror.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(dest, mirror)
    print(dest, Image.open(dest).size)


if __name__ == "__main__":
    main()
