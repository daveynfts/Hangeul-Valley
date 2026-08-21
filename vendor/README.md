# vendor/

Third-party runtime that ships with the game instead of being fetched at load time.

## phaser-3.70.0.min.js

`index.html` used to pull Phaser from `https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js`.
Two problems with that:

- **The desktop build was not offline.** `js/scenes/farm.js` opens with
  `class FarmScene extends Phaser.Scene`, which throws at script-evaluation time when the
  CDN is unreachable. `js/boot.js` builds its config with `Phaser.AUTO` *outside* its
  try/catch, so the `buildLevelSelectScreen()` fallback never got a chance to run either —
  losing the network meant a blank window, not a degraded one.
- **It put a third-party script inside the game's origin.** Anything served from the local
  desktop server was readable by that script.

### Provenance

Fetched from the npm registry (not the CDN) so the download is integrity-checked:

```bash
npm pack phaser@3.70.0
tar -xzf phaser-3.70.0.tgz package/dist/phaser.min.js
```

| | |
|---|---|
| Package | `phaser@3.70.0` |
| Tarball sha512 | `sha512-2g+gh+Jp9f/Ho9FOXOYbIJMGf3UZXyMbW2iLScFaLQw11e/LqVyxj/YmaBauWbHabeTnZjiWkPklDnxhesMH0g==` (matches `npm view phaser@3.70.0 dist.integrity`) |
| File sha256 | `3c27e64915c56b99d8c4f67664ca5924ccce8a60a234a221b74fd330748dae56` |
| Size | 1 167 282 bytes |

To re-verify the file in place:

```bash
sha256sum vendor/phaser-3.70.0.min.js
```

### Upgrading

Bump the version in the two places that name it — the `<script src>` in `index.html` and the
filename here — then redo the `npm pack` steps above and update the hashes in this file.
`vendor/` is served by Vercel directly and is on the desktop server's allowlist in
`main.py`; it is deliberately *not* part of the R2 content plan, because it is runtime, not
content.
