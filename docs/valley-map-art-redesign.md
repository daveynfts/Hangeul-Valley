# Valley map art redesign

The original Valley map now uses one reviewed sprite per interactive landmark instead
of mixing the accepted HD farm art with large procedural textures. The cassette station
uses the same pipeline so its map object reads as a cassette player before it is clicked.

## Shipped map art

| Role | Runtime key | Catalog path | Map scale |
| --- | --- | --- | ---: |
| Cassette | `cassette_player_hd` | `furniture/valley_cassette_player.png` | 0.72 |
| Seed shop | `valley_seed_shop_hd` | `stalls/valley_seed_shop.png` | 0.78 |
| Notice board | `valley_notice_board_hd` | `decorations/valley_notice_board.png` | 1.00 |
| Arcade | `valley_arcade_cabinet_hd` | `furniture/valley_arcade_cabinet.png` | 0.68 |
| Ginger cat | `valley_ginger_cat_hd` | `characters/valley_ginger_cat.png` | 0.58 |
| Apiary | `valley_apiary_hive_hd` | `decorations/valley_apiary_hive.png` | 1.15 |
| Dungeon portal | `valley_dungeon_portal_hd` | `decorations/valley_dungeon_portal.png` | 0.72 |
| Fishing pond | `valley_fishing_pond_hd` | `decorations/valley_fishing_pond.png` | 0.72 |
| Pond carp | `valley_pond_carp_hd` | `decorations/valley_pond_carp.png` | 0.82 |
| Spell witch | `valley_spell_witch_hd` | `characters/valley_spell_witch.png` | 1.00 |

The active Valley pack contains shop, board, arcade, cat, apiary, portal, pond, and carp.
Spell Duel was intentionally removed in commit `a872a6d`, so the witch is not re-enabled
as a dead interaction. Its retained legacy spawn path now uses the redesigned witch if an
older or custom world requests `wizard`.

All nine creators keep their procedural texture as a load-failure fallback. The reviewed
fishing pond branches before the generated rocks and reeds, so the two designs cannot stack.
The cat's old animation calls are also skipped for the new single-frame illustration while
the proximity, sleeping, facing, dialogue, and click behavior remain intact.

## Layout review

`valley-map-layout-review.png` renders the active Valley pack at the app's narrow
576 by 768 canvas with the exact runtime positions and sprite scales. The left and right
landmarks are clamped inside the canvas; the existing HD apple tree and well were moved in
from the edges, and the cat and apiary were separated from them.

`valley-map-art-review.png` is the nine-asset contact sheet. Its deterministic builder is
`scripts/build_valley_art_review.py`. Source image names, corrections, processing sizes,
and review state are recorded in `valley-map-art-manifest.json`.

The catalog and runtime share cache key `art-topik-213-extra-10-a87f32476a13`, which forces
browsers to fetch these files instead of retaining the old map sprites.
