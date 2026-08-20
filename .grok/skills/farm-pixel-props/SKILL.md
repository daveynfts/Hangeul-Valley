---
name: farm-pixel-props
description: >
  Make Hangeul Valley farm art as front-facing 2D pixel-art PNGs (Imagine +
  magenta key + Phaser load), not letter matrices. Use when adding or upgrading
  furniture, stalls, kitchens, desks, crops, fence blooms, trees, or other map
  props; when the user says "sprite đẹp", "farm prop", "bàn học", "bếp",
  "cây trồng", "hoa hàng rào", "apple tree", or runs /farm-pixel-props.
---

# Farm pixel props

Do not draw new farm props or plants with `PixelArtRenderer` letter matrices. That reads as a brown box at game scale. Use this pipeline.

## 1. Generate

`image_gen`, aspect `1:1`. One subject per image.

Prompt shape (2–5 sentences):

- Stardew / SNES-style 16-bit pixel-art game prop
- straight-on front view facing the camera (orthographic 2D, not isometric)
- isolated on flat solid magenta `#FF00FF`
- chunky dark outline, warm oak + farm palette
- no text, no grass, no floor, no drop shadow, no scene

Keep later variants on `image_edit` from the first accepted PNG so the set matches.

## 1b. Set contract

A family shares one parent PNG. Later pieces are `image_edit` from that parent, never a pile of sibling `image_gen`s. Furniture parent is the accepted `study_desk.png`. Crop growth stages edit from that crop's ripe PNG. Ripe/unripe landmarks edit from the same tree.

Height classes — pass `--height` to `process_prop.py` (default 156). Do not fake height with Phaser `scale: 2.4`.

| Class | `--height` | Use |
|---|---|---|
| `station` | 156 | desk, kitchen, stall |
| `accent` | 64 | stool, crate |
| `crop-sprout` | 32 | plot stage 1 |
| `crop-mid` | 44 | plot stage 2 |
| `crop-ripe` | 56 | plot stage 3 |
| `fence-bloom` | 28 | post flowers (no grass pad, no tint) |
| `ground-bloom` | 36 | wildflower clumps on grass (no grass pad) |
| `fauna` | 24 | butterflies (shared canvas per flap pair) |
| `landmark` | 180 | apple tree and similar |
| `character` | 80 | farm walk frames (`sprites/characters/<slug>/`) |

Naming lives in `sprites/catalog.json` (id, real-world `nameEn`, `path`, Phaser key, status). Paths are taxonomy folders, not flat dumps:

| Kind | Path |
|---|---|
| character | `characters/<slug>/walk_<dir>_<0\|1\|2>.png` |
| furniture | `furniture/<descriptive>.png` |
| stall | `stalls/<descriptive>.png` |
| crop | `plants/<species>/{sprout,growing,ripe}.png` |
| landmark | `plants/<species>/{summer,ripe}.png` |
| decoration | `decorations/<descriptive>.png` |

Add a catalog row **before** the PNG. `status: unused` keeps library art off the Phaser load list. Do not leave a PNG on disk that the catalog does not name.

Palette: match `STARDEW_PALETTE` wood/outline in `game.js`. Do not paint grass or ground. Phaser `createShadow` is the contact darkening.

One Phaser spawn path per family: `*_hd` key, matrix fallback, scale 1 on HD, no y-bob on planted sprites. Prefer `textures.exists(hd)`.

## 2. Key, crop, size

Run `scripts/process_prop.py` (Pillow) with the class `--height`. It keys magenta / rose, crops 2px pad (feet stay the last opaque row), resizes, keys again, and writes `sprites/<name>.png` (repo root is the source of truth).

Character sets: `--height 80 --subdir characters/<slug>` per frame, then one `--pad-set characters/<slug>` so every `walk_*.png` shares the same width (torso centered, extra rows above, feet last opaque row). Do not skip `--pad-set` — unequal widths sway the sprite. Register the frames in `sprites/catalog.json`.

Extra bottom pad makes the prop float.

## 3. Load in Phaser

```js
this.load.image('prop_hd', 'sprites/prop.png');
```

Place with origin `(0.5, 1)`. Scale `1.0` after `process_prop.py`. Do not bob planted props (`tweens` on `y` looks like they hover). Tree angle-sway is allowed.

Shadow under the feet (`createShadow`, small offset). Depth `y + 6`. Nearby `[SPACE]` only — no always-on name tags under props.

## 4. Sit on the grass

The tabletop / hood / canopy occupies the upper ~70% of the bitmap. If `y` is only ~90px south of the farm, the sprite covers plots.

Clear the farm tile rect:

- south props: station-class south row is `farm.h + 168` (shared `oy` for siblings). `y >= farm.y + farm.h + spriteDisplayHeight` is the minimum clear, not the placed value
- east props: `x` far enough that the left edge is past `farm.x + farm.w`, and `y` low enough the cabinet base sits on grass (`farm.h/2 + 96`)
- pond ellipse is a keep-out even when `_setPondVisible(false)`
- plot plants stay inside the 48px dirt tile; crop-ripe width must leave a gap to the neighbor plot

Interact radius follows the on-screen footprint (~80), not the old 48px matrix box.

## 5. Fallback

Keep the old matrix key only as a missing-file fallback. Prefer `*_hd` when `textures.exists`. Farm HD characters use keys `farmer_walk_{dir}_{frame}`, origin `(0.5, 1)`, scale `+1` (never negative). Idle is walk frame 0 of last facing. Matrix `player_*` stays for dungeon/fishing and missing-file fallback.

## 6. Character walk set

One parent: front `walk_down_0` via `image_gen` (straw-hat farmer, `STARDEW_PALETTE` human block, same camera as the desk). Turnarounds (`up` / `left` / `right`) are `image_edit` from that parent — true profiles, not three slightly-turned fronts. Right may be a horizontal flip of left. Walk is 4-dir × 3 frames (`0` contact/idle, `1` and `2` opposite feet), cycle `0,1,0,2` at 8 fps. No dedicated idle files.
