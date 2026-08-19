---
name: farm-pixel-props
description: >
  Make Hangeul Valley farm props as front-facing 2D pixel-art PNGs (Imagine +
  magenta key + Phaser load), not 20x20 letter matrices. Use when adding or
  upgrading furniture, stalls, kitchens, desks, or other map props; when the
  user says "sprite đẹp", "farm prop", "bàn học", "bếp", or runs /farm-pixel-props.
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

## 1b. Set contract

A set shares one parent PNG. Later pieces are `image_edit` from that parent, never three sibling `image_gen`s.

Height classes: `station` = script default 156; `accent` = `process_prop.py --height 64`. Crop, key, origin, and depth stay in §§2–3.

Naming: new world-pack props `unit10_<role>.png`. Do not rename shipped `study_desk.png` / `unit10_kitchen.png`.

Palette: match `STARDEW_PALETTE` wood/outline in `game.js`. Do not paint grass or ground.

One Phaser spawn path per set: HD key, matrix fallback, scale 1 on HD, no y-bob.

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

The tabletop / hood occupies the upper ~70% of the bitmap. If `y` is only ~90px south of the farm, the sprite covers plots.

Clear the farm tile rect:

- south props: station-class south row is `farm.h + 168` (shared `oy` for siblings). `y >= farm.y + farm.h + spriteDisplayHeight` is the minimum clear, not the placed value
- east props: `x` far enough that the left edge is past `farm.x + farm.w`, and `y` low enough the cabinet base sits on grass (`farm.h/2 + 96`)
- pond ellipse is a keep-out even when `_setPondVisible(false)`

Interact radius follows the on-screen footprint (~80), not the old 48px matrix box.

## 5. Fallback

Keep the old matrix key only as a missing-file fallback. Prefer `*_hd` when `textures.exists`.
