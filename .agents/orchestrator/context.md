# Context Summary — Hangeul Valley NPC Sprite Polish & Upgrade

## Overview
This project upgrades NPC graphics across Hangeul Valley to match the high visual quality of the upgraded Robot player character and Apple tree.

## Scope & Target Sprites
1. Shop NPC: multi-tone clothing shading, facial expressions, apron, hat, counter coins, 1px outlines.
2. Wizard NPC: detailed robes, star/moon embroidery, glowing staff with particle highlights, mystical beard, magical aura.
3. Cat NPC (Muop): world sprite fur texture, tabby stripes, eye catchlights, tail-swish idle animation.
4. Notice Board & Portal NPC: Notice board wood grain, pinned paper notes with text marks, lantern glow. Portal magical runes, swirling energy core, pulsing glow particles.
5. Beehive: honeycomb surface texture, layered straw/wood, dripping honey accent pixels.

## Key Rules
- DISPATCH-ONLY: Do not edit source code directly. Always spawn worker subagents.
- Non-regression: Do not break depth-sorting, collision, scale, positioning, or interaction callbacks.
- Audit gating: Forensic Auditor verdict must be CLEAN.
