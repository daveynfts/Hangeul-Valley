---
name: farm-pixel-props
description: >
  Make Hangeul Valley farm props as isometric pixel-art PNGs (Imagine + magenta
  key + Phaser load), not 20x20 letter matrices. Use when adding or upgrading
  furniture, stalls, kitchens, desks, or other map props; when the user says
  "sprite đẹp", "isometric", "farm prop", "bàn học", "bếp", or runs /farm-pixel-props.
---

# Farm pixel props

Do not draw new furniture with `PixelArtRenderer` letter matrices. That reads as a brown box at game scale. Use this pipeline.

## 1. Generate

`image_gen`, aspect `1:1`. One prop per image.

Prompt shape (2–5 sentences):

- Stardew / SNES-style 16-bit pixel-art game prop
- straight-on front view facing the camera (orthographic 2D, not isometric)
- isolated on flat solid magenta `#FF00FF`
- chunky dark outline, warm oak + farm palette
- no text, no grass, no floor, no drop shadow, no scene

Keep later variants on `image_edit` from the first accepted PNG so the set matches.

## 2. Key, crop, size

Run `scripts/process_prop.py` (Pillow). It:

- keys magenta / hot-pink to alpha
- crops to the silhouette with 2px pad (feet stay the bottom pixels)
- resizes height to 156px (LANCZOS), keys again
- writes `sprites/<name>.png` and `assets/sprites/<name>.png`

Feet of the furniture must be the last opaque row. Extra bottom pad makes the prop float.

## 3. Load in Phaser

In `FarmScene.preload`:

```js
this.load.image('prop_hd', 'sprites/prop.png');
```

Place with origin `(0.5, 1)` so the contact point is the bottom-center of the PNG. Scale `1.0` for the 156px-tall set. Do not bob planted props (`tweens` on `y` looks like they hover).

Shadow under the feet (`createShadow`, small offset). Depth `y + 6`. Label below at `y + 8`.

## 4. Sit on the grass

Isometric art is tall. The tabletop / hood occupies the upper ~70% of the bitmap. If `y` is only ~90px south of the farm, the sprite covers plots.

Clear the farm tile rect:

- south props: `y >= farm.y + farm.h + spriteDisplayHeight` (desk uses `farm.h + 168`)
- east props: `x` far enough that the left edge is past `farm.x + farm.w`, and `y` low enough the cabinet base sits on grass (`farm.h/2 + 96`)

Interact radius follows the on-screen footprint (~80), not the old 48px matrix box.

## 5. Fallback

Keep the old matrix key only as a missing-file fallback. Prefer `*_hd` when `textures.exists`.
