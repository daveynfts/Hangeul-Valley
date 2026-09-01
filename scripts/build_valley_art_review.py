"""Build a deterministic contact sheet for the reviewed Valley map sprites."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs/valley-map-art-manifest.json"
OUTPUT = ROOT / "docs/valley-map-art-review.png"
LAYOUT_OUTPUT = ROOT / "docs/valley-map-layout-review.png"
CELL_W, CELL_H = 320, 240
COLS = 3


def load_scaled(file: str, scale: float) -> Image.Image:
    sprite = Image.open(ROOT / file).convert("RGBA")
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    return sprite.resize(size, Image.Resampling.NEAREST)


def build_layout_preview(entries: list[dict]) -> None:
    width, height = 576, 768
    farm_x, farm_y, farm_w, farm_h = 198, 198, 180, 312
    layout = Image.new("RGBA", (width, height), (125, 166, 88, 255))
    draw = ImageDraw.Draw(layout)
    for row in range(5):
        for col in range(3):
            x = farm_x + col * 66
            y = farm_y + row * 66
            draw.rounded_rectangle((x, y, x + 48, y + 48), 4, fill=(126, 83, 52), outline=(76, 49, 34), width=2)

    by_role = {entry["role"]: entry for entry in entries}
    objects = [
        # depth, role, x, y, origin
        (103, "board", 288, 103, "bottom"),
        (173, "beehive", 208, 173, "bottom"),
        (188, "apple", 92, 188, "bottom"),
        (218, "arcade", 72, 218, "bottom"),
        (374, "fishing", 105, 394, "center"),
        (379, "shop", 486, 379, "bottom"),
        (585, "cat", 120, 585, "bottom"),
        (590, "portal", 512, 590, "bottom"),
        (595, "well", 48, 595, "bottom"),
    ]
    extra = {
        "apple": ("sprites/plants/apple_tree/summer.png", 1.0),
        "well": ("sprites/decorations/stone_well.png", 1.0),
    }
    for _depth, role, x, y, origin in sorted(objects):
        if role in by_role:
            entry = by_role[role]
            sprite = load_scaled(entry["file"], float(entry["mapScale"]))
        else:
            file, scale = extra[role]
            sprite = load_scaled(file, scale)
        px = round(x - sprite.width / 2)
        py = round(y - (sprite.height if origin == "bottom" else sprite.height / 2))
        layout.alpha_composite(sprite, (px, py))
        if role not in ("apple", "well"):
            draw.text((max(2, px), max(2, py - 12)), role, fill=(255, 248, 232, 255), stroke_width=1, stroke_fill=(35, 25, 18, 255))

    draw.rectangle((8, 728, 568, 758), fill=(36, 48, 34, 220), outline=(245, 224, 176, 255))
    draw.text((18, 738), "576x768 active Valley pack — exact sprite scales and edge clamps", fill=(255, 248, 232, 255))
    layout.save(LAYOUT_OUTPUT, "PNG")


def main() -> None:
    pack = json.loads(MANIFEST.read_text(encoding="utf-8"))
    entries = pack["entries"]
    rows = (len(entries) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * rows), (43, 63, 45, 255))
    draw = ImageDraw.Draw(sheet)

    for index, entry in enumerate(entries):
        col, row = index % COLS, index // COLS
        x0, y0 = col * CELL_W, row * CELL_H
        draw.rounded_rectangle(
            (x0 + 8, y0 + 8, x0 + CELL_W - 8, y0 + CELL_H - 8),
            radius=10,
            fill=(133, 166, 91, 255),
            outline=(245, 224, 176, 255),
            width=2,
        )
        sprite = Image.open(ROOT / entry["file"]).convert("RGBA")
        map_scale = float(entry["mapScale"])
        # Show roughly the in-game footprint, enlarged by 1.35 for a readable review.
        preview_scale = map_scale * 1.35
        preview_scale = min(preview_scale, 260 / sprite.width, 165 / sprite.height)
        size = (
            max(1, round(sprite.width * preview_scale)),
            max(1, round(sprite.height * preview_scale)),
        )
        sprite = sprite.resize(size, Image.Resampling.NEAREST)
        px = x0 + (CELL_W - sprite.width) // 2
        py = y0 + 198 - sprite.height
        sheet.alpha_composite(sprite, (px, py))
        draw.text((x0 + 18, y0 + 18), entry["role"].upper(), fill=(255, 248, 232, 255))
        draw.text((x0 + 18, y0 + 36), entry["slug"], fill=(31, 41, 28, 255))
        draw.text(
            (x0 + 18, y0 + 210),
            f'{sprite.width}x{sprite.height} preview  |  map {map_scale:g}x',
            fill=(31, 41, 28, 255),
        )

    sheet.save(OUTPUT, "PNG")
    build_layout_preview(entries)
    print(OUTPUT, sheet.size)
    print(LAYOUT_OUTPUT, (576, 768))


if __name__ == "__main__":
    main()
