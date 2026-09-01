"""Preserve transparency, key an opaque magenta backdrop, and size pixel sprites."""
from __future__ import annotations

import argparse
from collections import Counter, deque
from pathlib import Path

from PIL import Image


def is_key_color(r: int, g: int, b: int, a: int = 255) -> bool:
    # Saturated magenta only. Dusty purple, skin, cream clothes and dark
    # outlines are artwork, not evidence of a background.
    return a > 0 and r >= 170 and b >= 140 and g < min(r, b) * 0.55


def key_magenta(im: Image.Image, force: bool = False) -> Image.Image:
    im = im.convert("RGBA")
    if force:
        # Some generators cut out only the outside of a magenta-backed prop,
        # leaving matte islands inside a fan grille. Opt in only when the
        # source prompt reserved magenta for the backdrop.
        im.putdata([(0, 0, 0, 0) if is_key_color(*p) else p for p in im.getdata()])
        return im
    # Generated RGBA already has the correct cutout. Re-keying it used to
    # erase clothing and outlines whose RGB matched a transparent corner.
    if im.getchannel("A").getextrema()[0] < 255:
        return im
    return flood_key(im)


def flood_key(im: Image.Image) -> Image.Image:
    """Remove the evidenced magenta matte, never infer white/black keys."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    border += [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    keys = Counter(p[:3] for p in border if is_key_color(*p))
    matte = keys.most_common(1)[0][0] if keys else None
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
        if a > 0 and not is_key_color(r, g, b, a):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))
    if matte:
        # Holes inside a fan grille or bent arm can be disconnected from the
        # border. Only the actual matte RGB is reserved there, not every rose
        # or purple pixel in the artwork.
        for y in range(h):
            for x in range(w):
                color = px[x, y]
                if color[3] and max(abs(color[i] - matte[i]) for i in range(3)) <= 8:
                    px[x, y] = (0, 0, 0, 0)
    return im


def drop_fringe(im: Image.Image, min_alpha: int = 128) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= min_alpha else (0, 0, 0, 0)
    return im


def limit_palette(im: Image.Image, colors: int = 32) -> Image.Image:
    """Quantize visible pixels without dithering or spending colors on the backdrop."""
    if colors == 0:
        return im
    if not 2 <= colors <= 256:
        raise ValueError("colors must be 0 (keep source) or between 2 and 256")
    visible = [p[:3] for p in im.getdata() if p[3]]
    if len(set(visible)) <= colors:
        return im
    sample = Image.new("RGB", (len(visible), 1))
    sample.putdata(visible)
    palette = sample.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    result = im.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
    result.putalpha(im.getchannel("A"))
    return drop_fringe(result)


def safe_subdir(s: str) -> Path:
    p = Path(s.replace("\\", "/"))
    if p.is_absolute() or ".." in p.parts or p.anchor:
        raise SystemExit(f"bad subdir: {s}")
    return p


def process(src: Path, dest: Path, max_h: int = 156, pad: int = 2, colors: int = 32,
            force_magenta: bool = False) -> None:
    if max_h < 1 or pad < 0:
        raise ValueError("height must be positive and pad cannot be negative")
    im = key_magenta(Image.open(src), force=force_magenta)
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
    # Smooth resampling invents intermediate colors and erodes one-pixel
    # details. Pixel art keeps square cells and fully opaque silhouettes.
    im = im.resize((nw, max_h), Image.Resampling.NEAREST)
    im = limit_palette(drop_fringe(im), colors)
    bbox2 = im.getbbox()
    if not bbox2:
        raise ValueError(f"empty at target height: {src}")
    l2, t2, r2, b2 = bbox2
    # Keep the height class exact and put all vertical padding above the feet.
    cropped = im.crop((max(0, l2 - 1), t2, min(im.width, r2 + 1), b2))
    im = Image.new("RGBA", (cropped.width, max_h), (0, 0, 0, 0))
    im.paste(cropped, (0, max_h - cropped.height))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")


def pad_set(root: Path, subdir: str, height: int = 80) -> None:
    d = root / "sprites" / safe_subdir(subdir)
    files = sorted(list(d.glob("walk_*.png")) + list(d.glob("water_*.png")))
    if not files:
        raise SystemExit(f"no walk_*.png or water_*.png in {d}")
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
        # A source alpha mask here would multiply alpha by itself.
        canvas.paste(src, (x, y))
        canvas.save(f, "PNG")
        print(f, canvas.size)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src", nargs="?")
    p.add_argument("name", nargs="?", help="basename without extension, e.g. study_desk")
    p.add_argument("--root", default=".")
    p.add_argument("--height", type=int, default=156)
    p.add_argument("--colors", type=int, default=32, help="palette limit; 0 preserves source colors")
    p.add_argument("--key-magenta", action="store_true", help="remove reserved magenta even from a partly transparent source")
    p.add_argument("--subdir", default="", help="under sprites/, e.g. characters/valley-farmer")
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
    process(Path(args.src), dest, max_h=args.height, colors=args.colors,
            force_magenta=args.key_magenta)
    print(dest, Image.open(dest).size)


if __name__ == "__main__":
    main()
