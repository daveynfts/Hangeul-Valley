"""Key magenta, crop to feet, resize, write sprites/ + assets/sprites/."""
from __future__ import annotations

import argparse
import shutil
from collections import deque
from pathlib import Path

from PIL import Image


def is_key_color(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 40:
        return True
    # Magenta / rose key used by Imagine (#FF00FF, #C62090, dusty purple fills).
    rose = g < 110 and r > 140 and b > 90 and r > g + 40 and b > g
    hot = r >= 170 and b >= 150 and g <= 170 and (r + b) - 2 * g > 40
    dusty = r > 150 and 40 <= g <= 120 and 110 <= b <= 200 and r > g + 50
    return rose or hot or dusty


def key_magenta(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_key_color(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)
    return im


def flood_key(im: Image.Image, tol: int = 48) -> Image.Image:
    """Punch the Imagine fill from the canvas border so mixed-edge magenta dies."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    corners = [px[0, 0][:3], px[w - 1, 0][:3], px[0, h - 1][:3], px[w - 1, h - 1][:3]]

    def near_bg(r: int, g: int, b: int) -> bool:
        if is_key_color(r, g, b):
            return True
        for cr, cg, cb in corners:
            if abs(r - cr) + abs(g - cg) + abs(b - cb) <= tol * 3:
                return True
        return False

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if a == 0 or not near_bg(r, g, b):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))
    return im


def drop_fringe(im: Image.Image, min_alpha: int = 128) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < min_alpha or is_key_color(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)
    return im


def safe_subdir(s: str) -> Path:
    p = Path(s.replace("\\", "/"))
    if p.is_absolute() or ".." in p.parts or p.anchor:
        raise SystemExit(f"bad subdir: {s}")
    return p


def process(src: Path, dest: Path, max_h: int = 156, pad: int = 2) -> None:
    im = flood_key(key_magenta(Image.open(src)))
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
    im = drop_fringe(key_magenta(im))
    bbox2 = im.getbbox()
    if bbox2:
        l2, t2, r2, b2 = bbox2
        # Keep feet on the last row: do not crop the bottom.
        im = im.crop((max(0, l2 - 1), max(0, t2 - 1), min(im.width, r2 + 1), im.height))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")


def mirror_to_assets(root: Path, dest: Path) -> Path:
    try:
        rel = dest.relative_to(root / "sprites")
    except ValueError:
        raise SystemExit(f"dest not under sprites/: {dest}")
    mirror = root / "assets" / "sprites" / rel
    mirror.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(dest, mirror)
    return mirror


def pad_set(root: Path, subdir: str, height: int = 80) -> None:
    d = root / "sprites" / safe_subdir(subdir)
    files = sorted(d.glob("walk_*.png"))
    if not files:
        raise SystemExit(f"no walk_*.png in {d}")
    loaded: list[tuple[Path, Image.Image]] = []
    max_w = 0
    for f in files:
        im = Image.open(f).convert("RGBA")
        loaded.append((f, im))
        max_w = max(max_w, im.width)
    if max_w < 8:
        raise SystemExit(f"pad-set width too small: {max_w}")
    for f, im in loaded:
        canvas = Image.new("RGBA", (max_w, height), (0, 0, 0, 0))
        src = im
        if src.height > height:
            src = src.crop((0, src.height - height, src.width, src.height))
        x = (max_w - src.width) // 2
        y = height - src.height
        canvas.paste(src, (x, y), src)
        canvas.save(f, "PNG")
        mirror_to_assets(root, f)
        print(f, canvas.size)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src", nargs="?")
    p.add_argument("name", nargs="?", help="basename without extension, e.g. study_desk")
    p.add_argument("--root", default=".")
    p.add_argument("--height", type=int, default=156)
    p.add_argument("--subdir", default="", help="under sprites/, e.g. skins/farmer")
    p.add_argument("--pad-set", default="", help="pad walk_*.png in this subdir to shared canvas")
    args = p.parse_args()
    root = Path(args.root)

    if args.pad_set:
        pad_set(root, args.pad_set, height=args.height if args.height != 156 else 80)
        return

    if not args.src or not args.name:
        p.error("src and name are required unless --pad-set is used")

    sub = safe_subdir(args.subdir) if args.subdir else Path()
    dest = root / "sprites" / sub / f"{args.name}.png"
    process(Path(args.src), dest, max_h=args.height)
    mirror_to_assets(root, dest)
    print(dest, Image.open(dest).size)


if __name__ == "__main__":
    main()
