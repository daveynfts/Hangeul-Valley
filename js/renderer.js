// ═══════════════ PIXEL ENGINE ════════════════════════════════════════════════
const PS = 3;

// ═══════════════ STARDEW VALLEY EARTHY COLOR PALETTE ═════════════════════════
const STARDEW_PALETTE = {
  // Contour & Outlines
  outlineDark: 0x121016,      // Universal 1px deep dark contour outline
  outlineSoft: 0x251C2B,      // Soft inner shadow / joint line

  // Grass & Nature
  grassBase: 0x4A7C59,      // Warm forest green
  grassShadow: 0x2D4E35,    // Deep shade green
  grassHighlight: 0x6B9E77, // Soft spring green
  flowerRed: 0xD85858,      // Muted rose red
  flowerYellow: 0xE8B84B,   // Warm buttercup
  flowerPurple: 0x9B70C8,   // Soft lavender

  // Soil & Paths
  dirtDry: 0x7E5436,        // Warm rich earth
  dirtWet: 0x4E311B,        // Moist dark loam
  pathStone: 0x7D7571,      // Weathered cobble
  pathMortar: 0x4A4440,     // Dark mortar

  // Wood & Fences
  woodBase: 0x8F5428,       // Warm cedar brown
  woodHighlight: 0xB3713D,  // Warm oak highlight
  woodShadow: 0x573012,     // Deep timber shadow

  // Water & Beach
  oceanDeep: 0x1E506B,      // Deep teal ocean
  oceanShimmer: 0x3D7898,   // Subtle wave shimmer
  oceanFoam: 0x96C5D4,      // Desaturated seafoam
  sandBase: 0xEAD08B,       // Warm golden beach sand
  sandShadow: 0xCBA65B,     // Warm dune shadow

  // Player Outfit & Skin (Multi-tone)
  skinHighlight: 0xFAD8B0,
  skinBase: 0xEAA878,
  skinShadow: 0xC87858,
  skinDeepShadow: 0x984838,
  hairHighlight: 0x925A32,
  hairBase: 0x6A3E1E,
  hairShadow: 0x42240E,
  strawHatHighlight: 0xF8D88E,
  strawHatBase: 0xE4B663,
  strawHatShadow: 0xB88A3D,
  strawHatDeepShadow: 0x805A20,
  hatRibbonRed: 0xC0382B,
  hatRibbonShadow: 0x781D14,
  hatRibbonLight: 0xE74C3C,
  shirtLight: 0xF0EAE1,
  shirtBase: 0xD0D5DD,
  shirtShadow: 0x98A2B3,
  overallsHighlight: 0x5B6E9E,
  overallsBase: 0x3B4D7A,   // Muted indigo denim
  overallsShadow: 0x263354,  // Dark indigo shadow
  overallsDeepShadow: 0x161F38,
  brassButton: 0xE8C840,
  strawHat: 0xD4AA63,       // Unbleached straw
  hatRibbon: 0x9E3B2D,      // Muted terracotta red
  bootsHighlight: 0x7E4F2B,
  boots: 0x59381E,          // Leather brown
  bootsShadow: 0x382210,

  // Cat Fur & Details (Multi-tone)
  catFurHighlight: 0xFA9E50,
  catFurBase: 0xEE7B28,
  catFurShadow: 0xB84E10,
  catFurDeepShadow: 0x782D00,
  catWhiteFluff: 0xFFFFFF,
  catWhiteShadow: 0xE2E8F0,
  catNosePink: 0xFFB3C1,
  catEarInnerShadow: 0xE67E90,
  catEyeGreen: 0x55C655,
  catEyeHighlight: 0xA3F0A3,
  catEyePupil: 0x103B10,

  // Wizard Merlin Details (Multi-tone)
  wizRobeHighlight: 0xA78BFA,
  wizRobeBase: 0x8B5CF6,
  wizRobeShadow: 0x6D28D9,
  wizRobeDeepShadow: 0x4C1D95,
  wizBeardHighlight: 0xFFFFFF,
  wizBeardShadow: 0xE2E8F0,
  wizBeardDeepShadow: 0x94A3B8,
  wizGoldAccent: 0xFBBF24,
  wizGoldShadow: 0xD97706,
  wizCrystalHighlight: 0x7DD3FC,
  wizCrystalBase: 0x38BDF8,
  wizCrystalShadow: 0x0284C7,
  wizStaffWood: 0x78350F,
  wizStaffShadow: 0x451A03,

  // Dungeon & Stone
  dungeonWall: 0x2C363F,    // Deep mossy slate
  dungeonFloor: 0x1E242B,   // Dark stone tile
  torchAmber: 0xE68A2E,     // Cozy firelight amber
};

// ═══════════════ PIXEL ART RENDERER & CHARACTER SYSTEM ═══════════════════════

class PixelArtRenderer {
  static W_PAL = {
    '.': null,
    'K': 0x0F172A, // 1px Dark Slate Outline
    'k': 0x1E1B4B, // Deep shadow outline
    'p': 0xC084FC, // Bright lavender highlight
    'P': 0xA855F7, // Robe highlight purple
    'h': 0x8B5CF6, // Robe base purple
    'H': 0x7C3AED, // Robe mid purple
    'v': 0x6D28D9, // Robe deep purple
    'V': 0x4C1D95, // Robe shadow purple
    'u': 0x3B0764, // Robe darkest fold shadow
    'm': 0xFDE047, // Bright gold embroidery star/moon highlight
    'M': 0xF59E0B, // Gold embroidery midtone
    'y': 0xD97706, // Gold embroidery shadow
    'Y': 0xB45309, // Gold embroidery deep shadow
    'W': 0xFFFFFF, // Pure white beard highlight / aura glint
    'w': 0xF8FAFC, // Soft white beard top
    'd': 0xE2E8F0, // Light gray beard midtone
    'D': 0xCBD5E1, // Silver gray beard body
    'b': 0x94A3B8, // Blue-gray beard shadow
    'B': 0x64748B, // Deep beard shadow
    'S': 0x92400E, // Staff light wood
    's': 0x78350F, // Staff base wood
    'z': 0x451A03, // Staff dark wood shadow
    'q': 0xE0F2FE, // Orb core brilliant white-cyan
    'Q': 0xA5F3FC, // Orb inner glow cyan
    'c': 0x38BDF8, // Orb bright cyan
    'C': 0x0284C7, // Orb deep cyan
    'e': 0x0369A1, // Orb shadow cyan
    'a': 0xE9D5FF, // Mystical aura light purple sparkle
    'A': 0x67E8F9, // Mystical aura cyan sparkle
    'f': 0xFDE68A, // Star sparkle gold
    'X': 0xFFDDAD, // Skin peach
    'x': 0xC87858  // Skin shadow
  };

  static WIZ_0 = [
    '.......KfmK.....',
    '......KphhPK....',
    '.....KphHHHhK...',
    '....KphHHHHHhK.a',
    '...KphHHHHHHHhK.',
    '..KpvVVVVVVVVvpK',
    '..KmMMMyyMMMMMmK',
    '....KXxXKKXxXK.A',
    '....KwwWWwwwwK.q',
    '....KddDBBDddK.Q',
    '...KphHHDDbHHhKc',
    '..KphHHmMMmHHhKC',
    '..KphHHvVVvHHhKs',
    '..KphHHvVVvHHhKS',
    '.KphHHHvVVvHHHhS',
    '.KpvVVVuuuuVVvPS',
    '.KmMMMYYMMMMMmKS',
    '..KuuuuuuuuuuKs.',
    '.......KsK...KzK',
    '.......KzK......'
  ];

  static WIZ_1 = [
    '.......KmfK.....',
    '......KphhPK....',
    '.....KphHHHhK.a.',
    '....KphHHHHHhK..',
    '...KphHHHHHHHhKA',
    '..KpvVVVVVVVVvpK',
    '..KmMMMMMMMMMMmK',
    '....KXkXKKXkXK.a',
    '....KwwwwwwwwK.Q',
    '....KddDDDDddK.q',
    '...KphHHDDbHHhKC',
    '..KphHHmMMmHHhKe',
    '..KphHHvVVvHHhKs',
    '..KphHHvVVvHHhKS',
    '.KphHHHvVVvHHHhS',
    '.KpvVVVuuuuVVvPS',
    '.KmMMMMMMMMMMmKS',
    '..KuuuuuuuuuuKs.',
    '.......KsK...KzK',
    '.......KzK......'
  ];

  static drawMatrix(g, matrix, palette, ox = 0, oy = 0, ps = 3) {
    matrix.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const char = row[rx];
        if (char === '.' || char === ' ') continue;
        const col = palette[char];
        if (col !== undefined && col !== null) {
          g.fillStyle(col, 1);
          g.fillRect((ox + rx) * ps, (oy + ry) * ps, ps, ps);
        }
      }
    });
  }

  static createTexture(scene, key, matrix, palette, width = 16, height = 16, ps = 3) {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    const g = scene.make.graphics({ add: false });
    this.drawMatrix(g, matrix, palette, 0, 0, ps);
    g.generateTexture(key, width * ps, height * ps);
    g.destroy();
    const tex = scene.textures.get(key);
    if (tex) {
      const mode = (typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode)
        ? Phaser.Textures.FilterMode.NEAREST
        : 1;
      tex.setFilter(mode);
    }
    return key;
  }

  static generateAllTextures(scene) {
    if (!scene || !scene.textures) return;
    if (scene._pixelArtTexturesBaked) return;
    scene._pixelArtTexturesBaked = true;

    this._genPlayerTextures(scene);
    this._genNpcTextures(scene);
    this._genCropAndTreeTextures(scene);
    this._genFishingTextures(scene);
    this._genArcadeTextures(scene);
    this._genDungeonTextures(scene);
    this._genBossTextures(scene);
    this.generateTilemapTextures(scene);
    this._genParticleTextures(scene);
    this._genLightingTextures(scene);
    this._genParallaxTextures(scene);
    this._genWaterTextures(scene);
    this._genBeehiveTextures(scene);
    this._genBeeTextures(scene);
  }

  static generateTilemapTextures(scene) {
    if (!scene || !scene.textures) return;
    if (scene._tilemapTexturesGenerated) return;
    scene._tilemapTexturesGenerated = true;

    const makeTile = (key, renderFn) => {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
      const g = scene.make.graphics({ add: false });
      renderFn(g);
      g.generateTexture(key, 48, 48);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex) {
        const mode = (typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode)
          ? Phaser.Textures.FilterMode.NEAREST
          : 1;
        tex.setFilter(mode);
      }
      return key;
    };

    const TILEMAP_PALETTE = {
      '.': null,
      'K': 0x0F172A, // Dark slate outline / border
      'k': 0x1E293B, // Dark slate accent
      'H': 0x8FD19E, // Grass highlight green
      'G': 0x4A7C59, // Grass base green
      'g': 0x2D4E35, // Grass shade green
      'M': 0x1A3622, // Grass deep shadow green
      'B': 0xC4986C, // Path highlight tan
      'b': 0xA6754B, // Path base dirt
      'A': 0x7E5436, // Path rich earth brown
      'a': 0x573A23, // Path dark loam shadow
      'O': 0xD99B66, // Wood sunlit highlight
      'o': 0xB3713D, // Wood oak highlight
      'W': 0x8F5428, // Wood cedar base
      'w': 0x573012, // Wood deep shadow
      't': 0xC7C1BD, // Stone highlight
      'T': 0x9E9793, // Stone base
      'S': 0x7D7571, // Slate base
      's': 0x4A4440, // Mortar shadow
      'E': 0xE0F2FE, // Water foam white
      'c': 0x6BB1D6, // Water bright cyan
      'C': 0x3D7898, // Water medium blue
      'Z': 0x1E506B, // Water deep ocean teal
      'z': 0x153A4F, // Water abyss dark teal
      'Y': 0xFDE047, // Gold yellow
      'y': 0xD97706, // Amber orange
      'R': 0xEF4444, // Red highlight
      'r': 0x991B1B, // Red shadow
      'P': 0xA855F7, // Purple magic
      'p': 0x6D28D9, // Dark purple magic
      'F': 0xF472B6, // Pink flower
      'f': 0xDB2777, // Pink flower shadow
      'N': 0x475569, // Metal slate
      'n': 0x334155, // Metal dark slate
      'V': 0x38BDF8, // Cyan accent
      'v': 0x0284C7  // Deep cyan accent
    };

    const drawTileMatrix = (g, matrix) => {
      PixelArtRenderer.drawMatrix(g, matrix, TILEMAP_PALETTE, 0, 0, 3);
    };

    // ── FARM SCENE TILEMAP TEXTURES ──────────────────────────────────────────
    makeTile('tile_grass_base', (g) => {
      drawTileMatrix(g, [
        'GGGGHGGGGGGGHGGG',
        'GGGHGGGGHGGGGGGG',
        'GGGGGGGGGGGHGGGG',
        'HGGGGGGGGGGGGGHG',
        'GGGGGHGGGGGGGGGG',
        'GGHGGGGGGGHGGGGG',
        'GGGGGGGHGGGGGGGG',
        'GGGGGGGGGGGGHGGG',
        'GHGGGGGGGGGGGGGG',
        'GGGGGGHGGGGGGGGG',
        'GGGHGGGGGGGGHGGG',
        'GGGGGGGGGHGGGGGG',
        'GGGGHGGGGGGGGGGG',
        'HGGGGGGGGGGGHGGG',
        'GGGGGGGHGGGGGGGG',
        'GGHGGGGGGGGGGGHG'
      ]);
    });

    makeTile('tile_grass_flowers', (g) => {
      drawTileMatrix(g, [
        'GHGGGHGGGHGGGHGG',
        'GGH.FRF.HGg.Yy.G',
        'GGgFfRfFGgYyYyHG',
        'GGG.FRF.GGH.Yy.G',
        'GHGGGHGGGHGGGHGG',
        'GgGGHGgGGHGgGGHG',
        'GGH.Ff.GHGgGGGHG',
        'GGgFfFfFGgGHGGGg',
        'GGG.Ff.GGGHGGgGG',
        'GHGGGHGGGHGGGHGG',
        'GgGGHGgGG.VRV.HG',
        'GGHGgGGGVRVRVGHG',
        'GGgGHGGG.VRV.GgG',
        'GGGHGGgGGGHGGgGG',
        'GHGGGHGGGHGGGHGG',
        'GgGGHGgGGHGgGGHG'
      ]);
    });

    makeTile('tile_grass_clover', (g) => {
      drawTileMatrix(g, [
        'GHGGGHGGGHGGGHGG',
        'G.HH.GgGGH.HH.HG',
        'GHHHHGGGHGHHHHGG',
        'G.HH.GgGGH.HH.GG',
        'GHGGGHGGGHGGGHGG',
        'GgGGHGgGGHGgGGHG',
        'GGHGgGGGHGgGGGHG',
        'GGgG.HH.GgGHGGGg',
        'GGGHHHHGGGHGGgGG',
        'GHG.HH.GGHGGGHGG',
        'GgGGHGgGGHGgGGHG',
        'GGHGgGGGHG.HH.HG',
        'GGgGHGGGGHHHHGgG',
        'GGGHGGgGG.HH.GGG',
        'GHGGGHGGGHGGGHGG',
        'GgGGHGgGGHGgGGHG'
      ]);
    });

    makeTile('tile_path_straight', (g) => {
      drawTileMatrix(g, [
        'aaaaaAaAaAaaaaaa',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'aaaaaAaAaAaaaaaa'
      ]);
    });

    makeTile('tile_path_corner', (g) => {
      drawTileMatrix(g, [
        'aaaaaAaAaAaaaaaa',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AAAAAAAAAAAAAAAa',
        'ABBBBBBBBBBBBBAA',
        'AbbbbbbbbbbbbbAA',
        'AbbbbbbbbbbbbAAA',
        'AAAAAAAAAAAAAaAA',
        'ABBBBBBBBBAAaAAA',
        'AbbbbbbbbAAaAAAA',
        'AbbbbbbbAAaAAAAA',
        'AAAAAAAaAaAAAAAA',
        'AAAAAAaAaAAAAAAA',
        'aaaaaaAaAAAAAAAA',
        'aaaaaaaaaaaaaaaa'
      ]);
    });

    makeTile('tile_path_cross', (g) => {
      drawTileMatrix(g, [
        'aAaABBBBBBBAaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'AaAbbbbbbbbbaAaA',
        'ABBBBBBBBBBBBBBA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'AbbbbbbbbbbbbbbA',
        'ABBBBBBBBBBBBBBA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaABBBBBBBAaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'aaaaaaaaaaaaaaaa'
      ]);
    });

    makeTile('tile_path_single', (g) => {
      drawTileMatrix(g, [
        'gggggggggggggggg',
        'g.KKKKKKKKKKKK.g',
        'gKBBBBBBBBBBBBKg',
        'gKBbbbbbbbbbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAaaaaAbbBKg',
        'gKBbbAAAAAAbbBKg',
        'gKBbbbbbbbbbbBKg',
        'gKBBBBBBBBBBBBKg',
        'g.KKKKKKKKKKKK.g',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_path_stone', (g) => {
      drawTileMatrix(g, [
        'aAaABBBBBBBAaAaA',
        'AaAKttTTTTsKaAaA',
        'aAaKtTTTTTSsAaAa',
        'AaAKtTTTTTSsAaAa',
        'aAaKSSSSSSSSAaAa',
        'AaAKKKKKKKKKaAaA',
        'aAaABBBBBBBAaAaA',
        'AaAKttTTTTsKaAaA',
        'aAaKtTTTTTSsAaAa',
        'AaAKtTTTTTSsAaAa',
        'aAaKSSSSSSSSAaAa',
        'AaAKKKKKKKKKaAaA',
        'aAaABBBBBBBAaAaA',
        'AaAbbbbbbbbbaAaA',
        'aAaAbbbbbbbbaAaA',
        'aaaaaaaaaaaaaaaa'
      ]);
    });

    makeTile('tile_fence_h', (g) => {
      drawTileMatrix(g, [
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'GGGGGGGGGGGGGGGG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM'
      ]);
    });

    makeTile('tile_fence_v', (g) => {
      drawTileMatrix(g, [
        'GGKKOKGKKOKGGGGG',
        'GGKKOKGKKOKGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKOWGKKOWGGGGG',
        'GGKKwWGKKwWGGGGG',
        'ggKKwWGKKwWGgggg',
        'MMKKKKGKKKKGMMMM'
      ]);
    });

    makeTile('tile_fence_post', (g) => {
      drawTileMatrix(g, [
        '.....KKKKKK.....',
        '....KOOOOoOK....',
        '....KOOOOoOK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KggggggK....',
        '....KMMMMMMK....'
      ]);
    });

    makeTile('tile_fence_corner', (g) => {
      drawTileMatrix(g, [
        '.....KKKKKK.....',
        '....KOOOOoOK....',
        '....KOOOOoOK....',
        '....KOOWWwwKKKKK',
        '....KOOWWwwOOOOK',
        '....KOOWWWWWWWwK',
        '....KOOWWwwKKKKK',
        '....KOOWWwwK....',
        '....KOOWWwwK....',
        '....KOOWWwwKKKKK',
        '....KOOWWwwOOOOK',
        '....KOOWWWWWWWwK',
        '....KOOWWwwKKKKK',
        '....KOOWWwwK....',
        '....KggggggK....',
        '....KMMMMMMK....'
      ]);
    });

    makeTile('tile_house_roof', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRRRRRRRRRRRRRK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRKKKKRRKKKKRRKK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KKKKRRKKKKRRKKKK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRKKKKRRKKKKRRKK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_house_wall', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRKRRRRKRRRRK',
        'KrrrrKrrrrKrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_house_door', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRKKKKKKKKRRRRK',
        'KRRKOOOOOOKRRRRK',
        'KrrKOWWWWwKrrrrK',
        'KKKKOWWWWwKKKKKK',
        'KRRKOWWWWwKRRRRK',
        'KRRKOWWWWwKRRRRK',
        'KrrKOWWYYwKrrrrK',
        'KKKKOWWYYwKKKKKK',
        'KRRKOWWWWwKRRRRK',
        'KRRKOWWWWwKRRRRK',
        'KrrKOWWWWwKrrrrK',
        'KKKKOWWWWwKKKKKK',
        'KRRKOWWWWwKRRRRK',
        'KrrKowwwwwKrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_house_window', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KRRKKKKKKKKRRRRK',
        'KRRKYYYYYYKRRRRK',
        'KrrKYYYYYYKrrrrK',
        'KKKKYYKKYYKKKKKK',
        'KRRKYYKKYYKRRRRK',
        'KRRKYYYYYYKRRRRK',
        'KrrKYYYYYYKrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRRRRRRRRRRRK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK',
        'KRRRRRRRRRRRRRRK',
        'KrrrrrrrrrrrrrrK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_shore_top', (g) => {
      drawTileMatrix(g, [
        'GGGGGHGGGGGGGHGG',
        'GGGGGGGGGGGGGGGG',
        'GGgGGGGGGgGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGHGGGGGGGGGG',
        'GgGGGGGGGGGGGGgG',
        'gggggggggggggggg',
        'MMMMMMMMMMMMMMMM',
        'EEEEEEEEEEEEEEEE',
        'cccccccccccccccc',
        'CCCCCCCCCCCCCCCC',
        'CCCCCCCCCCCCCCCC',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz'
      ]);
    });

    makeTile('tile_shore_bottom', (g) => {
      drawTileMatrix(g, [
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'CCCCCCCCCCCCCCCC',
        'CCCCCCCCCCCCCCCC',
        'cccccccccccccccc',
        'EEEEEEEEEEEEEEEE',
        'MMMMMMMMMMMMMMMM',
        'gggggggggggggggg',
        'GgGGGGGGGGGGGGgG',
        'GGGGGHGGGGGGGGGG',
        'GGgGGGGGGgGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGHGGGGGGGHGG',
        'GGGGGGGGGGGGGGGG'
      ]);
    });

    makeTile('tile_shore_left', (g) => {
      drawTileMatrix(g, [
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGGgMECZZzzzz'
      ]);
    });

    makeTile('tile_shore_right', (g) => {
      drawTileMatrix(g, [
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG',
        'zzzzZZCEMgGGGGGG'
      ]);
    });

    makeTile('tile_shore_corner', (g) => {
      drawTileMatrix(g, [
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGGG',
        'GGGGGGGGGGGGGGgM',
        'GGGGGGGGGGGGgMEC',
        'GGGGGGGGGGgMECZZ',
        'GGGGGGGGgMECZZzz',
        'GGGGGGgMECZZzzzz',
        'GGGGGgMECZZzzzzz',
        'GGGGgMECZZzzzzzz',
        'GGGgMECZZzzzzzzz',
        'GGgMECZZzzzzzzzz',
        'GgMECZZzzzzzzzzz',
        'gMECZZzzzzzzzzzz',
        'MECZZzzzzzzzzzzz',
        'ECZZzzzzzzzzzzzz',
        'CZZzzzzzzzzzzzzz'
      ]);
    });

    // ── FISHING SCENE TILEMAP TEXTURES ───────────────────────────────────────
    makeTile('tile_sand', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYyYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYyYYYYYYYYYYyYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYyYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYyYYYYYYYYYYyYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYyYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYyYYYYYYYYYYyYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_sand_wet', (g) => {
      drawTileMatrix(g, [
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAVVVVAyAyAyA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAVVVVAyA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAVVVVAyAyAyAyA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy'
      ]);
    });

    makeTile('tile_rock_shore', (g) => {
      drawTileMatrix(g, [
        'yAyAyAyAyAyAyAyA',
        'AyAKKKKKKKKKKAAy',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKtTTTTTTTTsKAy',
        'AyKtTTTTTTTTsKAA',
        'yAKSSSSSSSSSSKAy',
        'AyKKKKKKKKKKKKAA',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy',
        'yAyAyAyAyAyAyAyA',
        'AyAyAyAyAyAyAyAy'
      ]);
    });

    makeTile('tile_pier_plank', (g) => {
      drawTileMatrix(g, [
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'KKKKKKKKKKKKKKKK',
        'KN..N......N..NK',
        'KN..N......N..NK',
        'KKKKKKKKKKKKKKKK',
        'KOOOOOOOOOOOOOOK',
        'KOOWWWWWWWWWWOOK',
        'KKwWWWWWWWWWWwKK',
        'KKKKKKKKKKKKKKKK',
        'KN..N......N..NK',
        'KN..N......N..NK',
        'KKKKKKKKKKKKKKKK',
        'KKKKKKKKKKKKKKKK'
      ]);
    });

    makeTile('tile_pier_post', (g) => {
      drawTileMatrix(g, [
        'ZZZZKKKKKKKKZZZZ',
        'ZZZZKOOOOoOKZZZZ',
        'ZZZZKOOOOoOKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'zzzzKzzzzzzKzzzz',
        'zzzzKzzzzzzKzzzz'
      ]);
    });

    makeTile('tile_pier_lantern', (g) => {
      drawTileMatrix(g, [
        'ZZZZZZKKKKZZZZZZ',
        'ZZZZZKYYYYKZZZZZ',
        'ZZZZKYYYYYYKZZZZ',
        'ZZZZKYYYYYYKZZZZ',
        'ZZZZZKYYYYKZZZZZ',
        'ZZZZZZKKKKZZZZZZ',
        'ZZZZKKKKKKKKZZZZ',
        'ZZZZKOOOOoOKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'ZZZZKOOWWwwKZZZZ',
        'zzzzKzzzzzzKzzzz',
        'zzzzKzzzzzzKzzzz'
      ]);
    });

    makeTile('tile_seashell', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYKKKKKKYYYYY',
        'YYYYKFFFFFFKYYYY',
        'YYYKFFFFFFffKYYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFffFFFfKYY',
        'YYYKFFFFffFFfKYY',
        'YYYYKFFFFFFfKYYY',
        'YYYYYKKKKKKYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_starfish', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYKKYYYYYYY',
        'YYYYYYKyYKYYYYYY',
        'YYYYYYKyYKYYYYYY',
        'YYYYYKKyyKKYYYYY',
        'YKKSKyYYYYyKSKKY',
        'YKyKyYYYYYYyKyKY',
        'YYKKYYYYYYYYKKYY',
        'YYYYKyyyyyyKYYYY',
        'YYYKKSKyKySKKYYY',
        'YYYKyyKYYKyyKYYY',
        'YYYKyKYYYYKyKYYY',
        'YYYKKYYYYYYKKYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_driftwood', (g) => {
      drawTileMatrix(g, [
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YKKKKKKKKKKKKKYY',
        'KOOOOOOOOOOOOoKY',
        'KOWWWWWWWWWWWwKY',
        'KOWWWWWWWWWWWwKY',
        'KKwWWWWWWWWWWwKK',
        'YKKKKKKKKKKKKKYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY',
        'YYYYYYYYYYYYYYYY'
      ]);
    });

    makeTile('tile_ocean_deep', (g) => {
      drawTileMatrix(g, [
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZzZZZZZZZZZZ',
        'ZZZZZzZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZzZZZZZZ',
        'ZZZZZZZZZzZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZzZZZZZZZZZZZZZ',
        'ZZzZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZzZZZZ',
        'ZZZZZZZZZZZzZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz'
      ]);
    });

    makeTile('tile_water_foam_border', (g) => {
      drawTileMatrix(g, [
        'EEEEEEEEEEEEEEEE',
        'EEEEEEEEEEEEEEEE',
        'cccccccccccccccc',
        'cccccccccccccccc',
        'CCCCCCCCCCCCCCCC',
        'CCCCCCCCCCCCCCCC',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'ZZZZZZZZZZZZZZZZ',
        'zzzzzzzzzzzzzzzz',
        'zzzzzzzzzzzzzzzz'
      ]);
    });

    // ── ARCADE SCENE TILEMAP TEXTURES ────────────────────────────────────────
    makeTile('tile_space_dark', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x1E1B4B, 0.4);
      g.fillRect(0, 0, 48, 1); g.fillRect(0, 0, 1, 48);
    });

    makeTile('tile_stars_far', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x38BDF8, 0.8);
      g.fillRect(6, 9, 2, 2); g.fillRect(36, 15, 2, 2); g.fillRect(21, 39, 2, 2);
      g.fillStyle(0xA855F7, 0.8);
      g.fillRect(27, 6, 2, 2); g.fillRect(12, 27, 2, 2);
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillRect(42, 33, 2, 2); g.fillRect(18, 18, 2, 2);
    });

    makeTile('tile_stars_near', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x00FFFF, 1); g.fillRect(15, 12, 3, 9); g.fillRect(12, 15, 9, 3);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(15, 15, 3, 3);
      g.fillStyle(0xF0ABFC, 1); g.fillRect(33, 30, 3, 9); g.fillRect(30, 33, 9, 3);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(33, 33, 3, 3);
    });

    makeTile('nebula_purple', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x581C87, 0.5); g.fillRect(6, 6, 36, 36);
      g.fillStyle(0x7E22CE, 0.6); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0xA855F7, 0.7); g.fillRect(18, 18, 12, 12);
      g.fillStyle(0xEC4899, 0.8); g.fillRect(21, 21, 6, 6);
    });

    makeTile('nebula_cyan', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x083344, 0.5); g.fillRect(6, 6, 36, 36);
      g.fillStyle(0x0E7490, 0.6); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0x06B6D4, 0.7); g.fillRect(18, 18, 12, 12);
      g.fillStyle(0x67E8F9, 0.8); g.fillRect(21, 21, 6, 6);
    });

    makeTile('planet_ringed', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xFDE047, 0.9); g.fillRect(3, 21, 42, 6);
      g.fillStyle(0x38BDF8, 0.8); g.fillRect(6, 24, 36, 3);
      g.fillStyle(0xEC4899, 1); g.fillRect(12, 12, 24, 24);
      g.fillStyle(0x9333EA, 1); g.fillRect(15, 15, 18, 18);
      g.fillStyle(0xFDE047, 0.9); g.fillRect(9, 21, 30, 3);
    });

    makeTile('planet_gas_giant', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xF97316, 1); g.fillRect(9, 9, 30, 30);
      g.fillStyle(0xEAB308, 1); g.fillRect(9, 15, 30, 6); g.fillRect(9, 27, 30, 6);
      g.fillStyle(0xA855F7, 1); g.fillRect(12, 21, 24, 6);
      g.fillStyle(0x06B6D4, 1); g.fillRect(21, 21, 6, 6);
    });

    makeTile('tile_starfield', (g) => {
      g.fillStyle(0x030712, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(6, 12, 3, 3); g.fillRect(36, 9, 3, 3); g.fillRect(21, 33, 3, 3);
      g.fillStyle(0x38BDF8, 0.8); g.fillRect(12, 39, 2, 2); g.fillRect(42, 27, 2, 2);
      g.fillStyle(0xFDE047, 0.8); g.fillRect(27, 15, 2, 2); g.fillRect(9, 24, 2, 2);
      g.fillStyle(0xA855F7, 0.7); g.fillRect(30, 42, 2, 2); g.fillRect(18, 6, 2, 2);
    });

    makeTile('tile_cosmic_bridge', (g) => {
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x4338CA, 0.6); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x6366F1, 0.8); g.fillRect(3, 3, 42, 42);
      g.fillStyle(0x818CF8, 1);
      g.fillRect(0, 0, 48, 3); g.fillRect(0, 45, 48, 3);
      g.fillRect(0, 0, 3, 48); g.fillRect(45, 0, 3, 48);
      g.fillStyle(0xC084FC, 0.9); g.fillRect(21, 21, 6, 6);
    });

    // ── DUNGEON SCENE TILEMAP TEXTURES ───────────────────────────────────────
    makeTile('tile_dungeon_floor', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 2); g.fillRect(0, 0, 2, 48);
      g.fillStyle(0x334155, 1);
      g.fillRect(6, 6, 18, 18); g.fillRect(27, 27, 15, 15);
      g.fillStyle(0x475569, 1); g.fillRect(6, 6, 18, 3); g.fillRect(6, 6, 3, 18);
    });

    makeTile('tile_dungeon_cracked', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 2); g.fillRect(0, 0, 2, 48);
      g.fillStyle(0x020617, 1);
      g.fillRect(6, 6, 3, 12); g.fillRect(9, 18, 12, 3);
      g.fillRect(21, 21, 3, 15); g.fillRect(24, 36, 18, 3);
      g.fillStyle(0x475569, 1); g.fillRect(9, 6, 3, 12); g.fillRect(24, 21, 3, 15);
    });

    makeTile('tile_dungeon_wall_moss', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1);
      g.fillRect(0, 21, 48, 3); g.fillRect(21, 0, 3, 21); g.fillRect(36, 24, 3, 24);
      g.fillStyle(0x15803D, 1);
      g.fillRect(3, 15, 15, 9); g.fillRect(24, 18, 18, 9); g.fillRect(15, 33, 15, 9);
      g.fillStyle(0x22C55E, 1);
      g.fillRect(6, 18, 9, 3); g.fillRect(27, 21, 12, 3); g.fillRect(18, 36, 9, 3);
    });

    makeTile('dungeon_torch', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x475569, 1); g.fillRect(21, 24, 6, 18); g.fillRect(18, 39, 12, 3);
      g.fillStyle(0x78350F, 1); g.fillRect(18, 18, 12, 9);
      g.fillStyle(0xFDE047, 0.25); g.fillRect(6, 0, 36, 36);
      g.fillStyle(0xEF4444, 1); g.fillRect(18, 9, 12, 12);
      g.fillStyle(0xF59E0B, 1); g.fillRect(21, 6, 6, 12);
      g.fillStyle(0xFEF08A, 1); g.fillRect(22, 6, 4, 6);
    });

    makeTile('tile_dungeon_rune', (g) => {
      g.fillStyle(0x1E293B, 1); g.fillRect(0, 0, 48, 48);
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 48, 2); g.fillRect(0, 0, 2, 48);
      g.fillStyle(0xA855F7, 0.4); g.fillRect(9, 9, 30, 30);
      g.fillStyle(0xA855F7, 1);
      g.fillRect(15, 12, 18, 3); g.fillRect(22, 15, 4, 21); g.fillRect(15, 24, 18, 3);
      g.fillStyle(0x67E8F9, 1); g.fillRect(22, 18, 4, 9);
    });
  }

  static _genParticleTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('p_drop')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('p_drop', 2, 8, (g) => {
      g.fillStyle(0x38BDF8, 0.9); g.fillRect(0, 0, 2, 8);
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(0, 0, 2, 2);
    });

    makeTex('p_snowflake', 5, 5, (g) => {
      g.fillStyle(0xE0F2FE, 0.7); g.fillRect(2, 0, 1, 5); g.fillRect(0, 2, 5, 1);
      g.fillStyle(0xFFFFFF, 1.0); g.fillRect(2, 2, 1, 1);
    });

    makeTex('p_fog', 32, 16, (g) => {
      g.fillStyle(0xCBD5E1, 0.25);
      g.fillCircle(10, 8, 8); g.fillCircle(22, 8, 8); g.fillCircle(16, 6, 6);
    });

    makeTex('p_leaf_green', 6, 6, (g) => {
      g.fillStyle(0x4ADE80, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
      g.fillStyle(0x15803D, 1); g.fillRect(2, 2, 2, 2);
    });

    makeTex('p_leaf_orange', 6, 6, (g) => {
      g.fillStyle(0xF97316, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
      g.fillStyle(0x9A3412, 1); g.fillRect(2, 2, 2, 2);
    });

    makeTex('p_dust', 4, 4, (g) => {
      g.fillStyle(0xD97706, 0.8); g.fillRect(0, 0, 4, 4);
      g.fillStyle(0xFDE047, 0.6); g.fillRect(1, 1, 2, 2);
    });

    makeTex('p_splash', 4, 4, (g) => {
      g.fillStyle(0x38BDF8, 0.9); g.fillRect(0, 0, 4, 4);
      g.fillStyle(0xFFFFFF, 0.9); g.fillRect(1, 1, 2, 2);
    });

    makeTex('p_spark', 3, 3, (g) => {
      g.fillStyle(0xF97316, 1); g.fillRect(0, 0, 3, 3);
      g.fillStyle(0xFEF08A, 1); g.fillRect(1, 1, 1, 1);
    });

    makeTex('p_sparkle', 8, 8, (g) => {
      g.fillStyle(0xFACC15, 1); g.fillRect(3, 0, 2, 8); g.fillRect(0, 3, 8, 2);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(3, 3, 2, 2);
    });

    makeTex('p_firefly', 5, 5, (g) => {
      g.fillStyle(0xFDE047, 0.35); g.fillRect(0, 1, 5, 3); g.fillRect(1, 0, 3, 5);
      g.fillStyle(0xFEF08A, 0.9); g.fillRect(1, 1, 3, 3);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(2, 2, 1, 1);
    });
  }

  static _genLightingTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('light_glow_soft')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('light_glow_soft', 128, 128, (g) => {
      const rad = 64;
      for (let r = rad; r > 0; r -= 4) {
        const alpha = Math.pow(1 - (r / rad), 2) * 0.7;
        g.fillStyle(0xFFFB7D, alpha);
        g.fillCircle(rad, rad, r);
      }
    });

    makeTex('light_glow_torch', 96, 96, (g) => {
      const rad = 48;
      for (let r = rad; r > 0; r -= 3) {
        const alpha = Math.pow(1 - (r / rad), 2) * 0.8;
        g.fillStyle(0xF59E0B, alpha);
        g.fillCircle(rad, rad, r);
      }
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillCircle(rad, rad, 8);
    });

    makeTex('light_glow_lantern', 64, 64, (g) => {
      const rad = 32;
      for (let r = rad; r > 0; r -= 2) {
        const alpha = Math.pow(1 - (r / rad), 2) * 0.75;
        g.fillStyle(0x38BDF8, alpha);
        g.fillCircle(rad, rad, r);
      }
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillCircle(rad, rad, 5);
    });
  }

  static _genParallaxTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('bg_distant_mountains')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('bg_distant_mountains', 256, 128, (g) => {
      g.fillStyle(0x1E1B4B, 0.95);
      g.beginPath();
      g.moveTo(0, 128); g.lineTo(0, 78); g.lineTo(36, 28); g.lineTo(58, 48);
      g.lineTo(88, 18); g.lineTo(118, 62); g.lineTo(156, 14); g.lineTo(190, 58);
      g.lineTo(222, 32); g.lineTo(256, 72); g.lineTo(256, 128);
      g.closePath(); g.fillPath();
      g.fillStyle(0x312E81, 0.75);
      g.beginPath();
      g.moveTo(0, 128); g.lineTo(0, 96); g.lineTo(48, 70); g.lineTo(92, 92);
      g.lineTo(140, 64); g.lineTo(188, 88); g.lineTo(230, 68); g.lineTo(256, 90);
      g.lineTo(256, 128);
      g.closePath(); g.fillPath();
      g.fillStyle(0xE2E8F0, 0.55); g.fillRect(82, 18, 10, 6); g.fillRect(150, 14, 12, 6);
      g.fillStyle(0x4338CA, 0.45); g.fillRect(0, 108, 256, 20);
    });

    makeTex('bg_rolling_hills', 256, 128, (g) => {
      g.fillStyle(0x14532D, 0.95);
      g.fillCircle(48, 132, 86); g.fillCircle(200, 136, 96);
      g.fillStyle(0x166534, 0.92); g.fillCircle(128, 128, 78);
      g.fillStyle(0x4ADE80, 0.18); g.fillCircle(118, 110, 22); g.fillCircle(70, 118, 14);
    });
  }

  static _genWaterTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('tile_ocean_deep_0')) return;

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    for (let f = 0; f < 4; f++) {
      makeTex(`tile_ocean_deep_${f}`, 48, 48, (g) => {
        g.fillStyle(0x0E7490, 1); g.fillRect(0, 0, 48, 48);
        g.fillStyle(0x155E75, 1); g.fillRect(0, 22, 48, 26);
        g.fillStyle(0x164E63, 1); g.fillRect(0, 34, 48, 14);
        const offset = f * 10;
        g.fillStyle(0x22D3EE, 0.55);
        g.fillRect((4 + offset) % 48, 10, 14, 2);
        g.fillRect((22 + offset) % 48, 20, 16, 2);
        g.fillRect((10 + offset) % 48, 30, 12, 2);
        g.fillStyle(0x67E8F9, 0.7);
        g.fillRect((8 + offset) % 48, 11, 6, 1);
        g.fillRect((28 + offset) % 48, 21, 7, 1);
        g.fillStyle(0x14532D, 0.25);
        g.fillRect((16 + (f % 2) * 8) % 48, 36, 10, 3);
      });
    }

    for (let f = 0; f < 4; f++) {
      makeTex(`tile_water_foam_${f}`, 48, 48, (g) => {
        g.fillStyle(0x0E7490, 1); g.fillRect(0, 0, 48, 48);
        const foamH = Math.round(5 + Math.sin(f * Math.PI / 2) * 3);
        g.fillStyle(0x5EEAD4, 0.85); g.fillRect(0, 0, 48, foamH + 5);
        g.fillStyle(0xECFEFF, 0.95); g.fillRect(0, 0, 48, foamH);
        g.fillStyle(0xA5F3FC, 0.9);
        g.fillRect((f * 12) % 48, foamH, 10, 2);
        g.fillRect((f * 12 + 22) % 48, foamH + 2, 8, 2);
      });
    }

    const LILY_PAL = {
      '.': null, 'K': 0x14532D, 'H': 0x86EFAC, 'G': 0x4ADE80, 'g': 0x166534,
      'P': 0xF472B6, 'p': 0xDB2777, 'Y': 0xFDE047
    };
    this.createTexture(scene, 'lily_pad', [
      '....KKKKKK......',
      '..KKHGGGGHKK....',
      '.KHGGGGGGGGHK...',
      'KHGGHGGGHGGGHK..',
      'KGGGGGGGGGGGgK..',
      'KHGGGGYGGGGGHK..',
      'KGGGGGGGGGGGgK..',
      'KHGGHGGGHGGGHK..',
      '.KHGGGGGGGGHK...',
      '..KKHGGGGHKK....',
      '....KKKKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], LILY_PAL, 16, 16, 2);

    this.createTexture(scene, 'lily_bloom', [
      '......K.......',
      '.....KPK......',
      '....KPYpK.....',
      '...KPpYpPK....',
      '....KPYpK.....',
      '.....KPK......',
      '......K.......',
      '......g.......',
      '.....GgG......',
      '....GGGGG.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], LILY_PAL, 16, 16, 2);

    const REED_PAL = { '.': null, 'K': 0x365314, 'G': 0x4D7C0F, 'g': 0x3F6212, 'B': 0x854D0E, 'b': 0xA16207, 'Y': 0xCA8A04 };
    this.createTexture(scene, 'pond_reed', [
      '......YK........',
      '.....YbK........',
      '......BK........',
      '......gK........',
      '.....GgK........',
      '......GK...YK...',
      '......gK..YbK...',
      '.....GgK...BK...',
      '......GK...gK...',
      '......gK..GgK...',
      '.....GgK...GK...',
      '......GKg.gK....',
      '......gKGGK.....',
      '.....KgKK.......',
      '....KK..........',
      '................'
    ], REED_PAL);
  }

  static _genBeehiveTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('beehive')) return;

    const BEEHIVE_PALETTE = {
      '.': null,
      'K': 0x0F172A,
      'k': 0x1E293B,
      'b': 0x451A03,
      'B': 0x78350F,
      'W': 0x92400E,
      'w': 0xB45309,
      'O': 0xD97706,
      'S': 0x642404,
      'D': 0x853208,
      'A': 0xA7490A,
      'M': 0xC46808,
      'Y': 0xFACC15,
      'y': 0xFDE047,
      'H': 0xFEF08A,
      'C': 0xFFFBEB,
      'G': 0xF59E0B,
      'g': 0xE08208
    };

    this.createTexture(scene, 'beehive', [
      ".......KKKKKK.......",
      ".....KKyHHHHyyKK....",
      "....KyHHyYYYYyHHyK..",
      "...KyHYDMDMDMDMYyYK.",
      "..KyYYMDMDMDMDMDYYyK",
      "..KSSSACAMMACASSSyK.",
      ".KyHYDMDMKKKKMDMDMYK",
      ".KyYMDMDkKKKKkMDMYyK",
      "KyHYDMDkKKKKKKkMDMYK",
      "KyYMDMDkKKKKKKkMDYyK",
      "KyHYDMDkKKKKKKkMDMYK",
      "KyYMDMDMkKKKKkMDMYyK",
      ".KyHYDMDMAAAAMDMDMYK",
      ".KyYSSSSSACASSSSSSyK",
      "..KyYYYYYYYYYYYYYyK.",
      "..KSSSGgCGgCGgGSSyK.",
      "...KGgC..GgC..GgCK..",
      "...Kgg...gG...ggKK..",
      "..KbOOOOOOOOOOOOwKb.",
      ".bBWWWWWWWWWWWWWWBBb",
      "bBBBBBBBBBBBBBBBBBBb",
      "bKKKKKKKKKKKKKKKKKKb"
    ], BEEHIVE_PALETTE, 20, 22, 2);

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('p_tiny_bee', 5, 5, (g) => {
      g.fillStyle(0x0F172A, 1); g.fillRect(0, 0, 5, 5);
      g.fillStyle(0xFDE047, 1); g.fillRect(1, 1, 3, 3);
      g.fillStyle(0x1E293B, 1); g.fillRect(2, 1, 1, 3);
      g.fillStyle(0xE0F2FE, 1); g.fillRect(1, 0, 2, 1);
    });
  }

  static _genBeeTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('bee_fly_0')) return;

    const BEE_PALETTE = {
      '.': null,
      'K': 0x0F172A,
      'k': 0x1E293B,
      'Y': 0xFDE047,
      'y': 0xD97706,
      'W': 0xE0F2FE,
      'w': 0xBAE6FD,
      'H': 0xFFFFFF
    };

    this.createTexture(scene, 'bee_fly_0', [
      "..www.....www...",
      ".wWWw.....wWWw..",
      ".wWWw.....wWWw..",
      "..www.kkk.www...",
      "....kYYYYYK.....",
      "...kYkkkYkkkY...",
      "..kYkHkYkHkYk...",
      "..kYkkkYkkkYk...",
      "..kYYYYYYYYYk...",
      "..kykkkykkkyk...",
      "...kYYYYYYYk....",
      "....kyyyykk.....",
      ".....kkyk.......",
      "................",
      "................",
      "................"
    ], BEE_PALETTE, 16, 16, 3);

    this.createTexture(scene, 'bee_fly_1', [
      "................",
      "......kkk.......",
      "....kYYYYYK.....",
      "...kYkkkYkkkY...",
      ".wWWkHkYkHkYkWWw",
      "wWWwYkkkYkkkYwWWw",
      ".wwYYYYYYYYYww..",
      "..kykkkykkkyk...",
      "...kYYYYYYYk....",
      "....kyyyykk.....",
      ".....kkyk.......",
      "................",
      "................",
      "................",
      "................",
      "................"
    ], BEE_PALETTE, 16, 16, 3);

    const makeTex = (key, w, h, drawFn) => {
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const g = scene.make.graphics({ add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
      const tex = scene.textures.get(key);
      if (tex && typeof Phaser !== 'undefined' && Phaser.Textures && Phaser.Textures.FilterMode) {
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    };

    makeTex('p_pollen', 6, 6, (g) => {
      g.fillStyle(0xFDE047, 1); g.fillRect(1, 0, 4, 6); g.fillRect(0, 1, 6, 4);
      g.fillStyle(0xFFFFFF, 1); g.fillRect(2, 2, 2, 2);
    });

    makeTex('p_honey_drip', 4, 8, (g) => {
      g.fillStyle(0xF59E0B, 0.9); g.fillRect(1, 0, 2, 8); g.fillRect(0, 4, 4, 4);
      g.fillStyle(0xFEF08A, 1); g.fillRect(1, 1, 1, 3);
    });
  }

  // 1. Player Farmer 4-Direction Walk Cycle & Action Animations (Industrial Yellow Farmer Pixel Robot)
  static _genPlayerTextures(scene) {
    const P = {
      '.': null,

      // 1px Dark Outline & Contours
      'K': 0x0F172A,   // Dark slate outline (Slate 900)
      'k': 0x1E293B,   // Dark inner contour / chassis shadow (Slate 800)

      // Industrial Yellow Metallic Casing
      'Y': 0xFEF08A,   // Yellow casing metallic highlight (Yellow 200)
      'y': 0xFACC15,   // Yellow casing main base (Yellow 400)
      'J': 0xEAB308,   // Yellow casing mid-shade (Yellow 500)
      'j': 0xCA8A04,   // Yellow casing shadow (Yellow 600)

      // Metallic Gray / Slate Body, Joints & Treads
      'C': 0xE2E8F0,   // Bright metal reflection (Slate 200)
      'c': 0xCBD5E1,   // Light joint cap / accent (Slate 300)
      'm': 0x94A3B8,   // Slate gray light base (Slate 400)
      'M': 0x64748B,   // Slate gray mid base (Slate 500)
      'd': 0x475569,   // Dark metal frame / housing (Slate 600)
      'D': 0x334155,   // Deep joint shadow / inner core (Slate 700)
      'S': 0x64748B,   // Slate mid base
      's': 0x475569,   // Dark slate shadow

      // Glowing LED Visor & Screen Expressions
      'W': 0xFFFFFF,   // Bright LED glare / eye white highlight
      'L': 0xE0F2FE,   // Visor glint highlight
      'V': 0x38BDF8,   // Glowing cyan eye / pixel display (Sky 400)
      'v': 0x06B6D4,   // Visor base screen (Cyan 500)
      'z': 0x0284C7,   // Deep visor screen shadow (Sky 600)
      'Z': 0x0369A1,   // Visor frame border (Sky 700)
      'B': 0x0284C7,   // Visor cyan shadow edge
      'b': 0x0369A1,   // Visor dark border

      // Antenna Tip & Gear Accent Details
      'O': 0xFFEDD5,   // Antenna tip white glow
      'o': 0xF97316,   // Warning beacon glow (Orange 500)
      'R': 0xEF4444,   // Warning light red / Amber-orange
      'r': 0xC2410C,   // Dark amber shadow
      'A': 0xF59E0B,   // Antenna bulb / brass gear core (Amber 500)
      'a': 0xD97706,   // Brass gear shadow (Amber 600)

      // Straw hat (farm silhouette on the robot)
      'h': 0xF8D88E,
      't': 0xE4B663,
      'T': 0xB88A3D,
      'i': 0xC0382B,

      // Status Indicator, Action FX, Tool & Crop Compatibility Tokens
      'G': 0x22C55E,   // Status indicator green / Crop leaf green
      'g': 0x15803D,   // Dark green indicator
      'n': 0x78350F,   // Tool wood handle
      'u': 0x38BDF8,   // Water droplet cyan
      'U': 0x0284C7,   // Deep water splash blue
      'w': 0xE0F2FE,   // Water highlight white-blue
      'X': 0xFFE0C2,   // Action highlight / detail
      'q': 0x213252,   // Chassis accent shadow
      'Q': 0x141E36,   // Deep underchassis black/shadow
      '2': 0x1E3A8A,   // Deep accent shadow
      'F': 0xD5CFBF    // Tool/action metallic accent
    };

    // 12 Walk Matrices (Designed by Explorer 2)
    const down_0 = [
      '....KhhhhhhK....',
      '...KhthitihthK..',
      '....KTttttTTK...',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '..KYyKbCCCCbYKK.',
      '..KYyKCLWCLWbYK.',
      '..KJJyKbbbbKYJK.',
      '..KKmYYYYYYmKK..',
      '..KSmYyGRyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKDDDKKKKDDDKK.',
      '.KDmSDKKKKDmSDK.',
      '.KDsDDKKKKDsDDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const down_1 = [
      '....KhhhhhhK....',
      '...KhthitihthK..',
      '....KTttttTTK...',
      '...KYYYYYYYYK...',
      '..KYyKbCCCCbYKK.',
      '..KYyKCLWCLWbYK.',
      '..KJJyKbbbbKYJK.',
      '..KKmYYYYYYmKK..',
      '..KSmYyGRyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDDKK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const down_2 = [
      '....KhhhhhhK....',
      '...KhthitihthK..',
      '....KTttttTTK...',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '..KYyKbCCCCbYKK.',
      '..KYyKCLWCLWbYK.',
      '..KJJyKbbbbKYJK.',
      '..KKmYYYYYYmKK..',
      '..KSmYyGRyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDsDDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const up_0 = [
      '....KhhhhhhK....',
      '...KhtthhtthK...',
      '....KTTTTTTK....',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '...KYyJkkJyYK...',
      '...KYyJkkJyYK...',
      '...KJJyyyyJJK...',
      '..KKmYYYYYYmKK..',
      '..KSmYyDDyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKDDDKKKKDDDKK.',
      '.KDmSDKKKKDmSDK.',
      '.KDsDDKKKKDsDDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const up_1 = [
      '....KhhhhhhK....',
      '...KhtthhtthK...',
      '....KTTTTTTK....',
      '...KYYYYYYYYK...',
      '...KYyJkkJyYK...',
      '...KYyJkkJyYK...',
      '...KJJyyyyJJK...',
      '..KKmYYYYYYmKK..',
      '..KSmYyDDyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDDKK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDmSDK.',
      '.KDmSDKKKKDmSDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const up_2 = [
      '....KhhhhhhK....',
      '...KhtthhtthK...',
      '....KTTTTTTK....',
      '....KKKKKKKK....',
      '...KYYYYYYYYK...',
      '...KYyJkkJyYK...',
      '...KYyJkkJyYK...',
      '...KJJyyyyJJK...',
      '..KKmYYYYYYmKK..',
      '..KSmYyDDyYmSK..',
      '.KKSsDDDDDDsSKK.',
      '.KKSDDKKKKDDSDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDmSDKKKKDsDDK.',
      '.KDsDDKKKKDsDDK.',
      '.KKKKKKKKKKKKKK.'
    ];

    const left_0 = [
      '...KhhhhK.......',
      '..KhthitK.......',
      '...KTtttK.......',
      '...KKYYKKKK.....',
      '..KYyyyyyyYK....',
      '.KYyKbCCCbYYK...',
      '.KYyKCLWbYYYK...',
      '.KJJyKbbbYYJK...',
      '..KKmYYYYYmKK...',
      '..KSmYyGRySK....',
      '.KKSsDDDDDsKK...',
      '.KKDDDDDDDDDKK..',
      '.KDmSmSmSmSmDK..',
      '.KDsDsDsDsDsDK..',
      '.KDmSmSmSmSmDK..',
      '.KKKKKKKKKKKKK..'
    ];

    const left_1 = [
      '...KhhhhK.......',
      '..KhthitK.......',
      '...KKYYKKKK.....',
      '..KYyyyyyyYK....',
      '.KYyKbCCCbYYK...',
      '.KYyKCLWbYYYK...',
      '.KJJyKbbbYYJK...',
      '..KKmYYYYYmKK...',
      '..KSmYyGRySK....',
      '.KKSsDDDDDsKK...',
      '.KDsDsDsDsDsDK..',
      '.KDmSmSmSmSmDK..',
      '.KDsDsDsDsDsDK..',
      '.KDmSmSmSmSmDK..',
      '.KDsDsDsDsDsDK..',
      '.KKKKKKKKKKKKK..'
    ];

    const left_2 = [
      '...KhhhhK.......',
      '..KhthitK.......',
      '...KTtttK.......',
      '...KKYYKKKK.....',
      '..KYyyyyyyYK....',
      '.KYyKbCCCbYYK...',
      '.KYyKCLWbYYYK...',
      '.KJJyKbbbYYJK...',
      '..KKmYYYYYmKK...',
      '..KSmYyGRySK....',
      '.KKSsDDDDDsKK...',
      '.KKDDDDDDDDDKK..',
      '.KDmDmDmDmDmDK..',
      '.KDsDsDsDsDsDK..',
      '.KDmDmDmDmDmDK..',
      '.KKKKKKKKKKKKK..'
    ];

    const right_0 = [
      '.......KhhhhK...',
      '.......KtihthK..',
      '.......KtttTK...',
      '.....KKKKYYKK...',
      '....KYyyyyyyYK..',
      '...KYYbCCCbYyYK.',
      '...KYYYbWLCbYyYK',
      '...KJYYbbbKyJKK.',
      '..KKmYYYYYmKK...',
      '....KSyRGyYmSK..',
      '....KKsDDDDDsKK.',
      '...KKDDDDDDDDDKK',
      '..KDmSmSmSmSmDK.',
      '..KDsDsDsDsDsDK.',
      '..KDmSmSmSmSmDK.',
      '..KKKKKKKKKKKKK.'
    ];

    const right_1 = [
      '.......KhhhhK...',
      '.......KtihthK..',
      '.....KKKKYYKK...',
      '....KYyyyyyyYK..',
      '...KYYbCCCbYyYK.',
      '...KYYYbWLCbYyYK',
      '...KJYYbbbKyJKK.',
      '..KKmYYYYYmKK...',
      '....KSyRGyYmSK..',
      '....KKsDDDDDsKK.',
      '..KKsDsDsDsDsDK.',
      '..KDmSmSmSmSmDK.',
      '..KDsDsDsDsDsDK.',
      '..KDmSmSmSmSmDK.',
      '..KDsDsDsDsDsDK.',
      '..KKKKKKKKKKKKK.'
    ];

    const right_2 = [
      '.......KhhhhK...',
      '.......KtihthK..',
      '.......KtttTK...',
      '.....KKKKYYKK...',
      '....KYyyyyyyYK..',
      '...KYYbCCCbYyYK.',
      '...KYYYbWLCbYyYK',
      '...KJYYbbbKyJKK.',
      '..KKmYYYYYmKK...',
      '....KSyRGyYmSK..',
      '....KKsDDDDDsKK.',
      '...KKDDDDDDDDSDK',
      '..KDmDmDmDmDmDK.',
      '..KDsDsDsDsDsDK.',
      '..KDmDmDmDmDmDK.',
      '..KKKKKKKKKKKKK.'
    ];

    // 9 Action Matrices (Designed by Explorer 3)
    const water_down_0 = [
      '....KhhhhhhK....',
      '...KhthitihthK..',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdyKnKK',
      '.KKyJJJJJJJJmMMK',
      '..KKDDDDDDDKdMK.',
      '..KKdMMMMMMKdMK.',
      '.KKDDkDDkDDKdKKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const water_down_1 = [
      '....KhhhhhhK....',
      '...KhthitihthK..',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdyFKKK',
      '.KKyJJJJJJJBFKnK',
      '..KKDDDDDDDZZKMm',
      '..KKdMMMMMM2KdUK',
      '.KKDDkDDkDD2KdWK',
      '.KKKKKKKKKKKKKUK'
    ];

    const water_down_2 = [
      '....KhhhhhhK....',
      '...KhthitihthK..',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdyFKKK',
      '.KKyJJJJJJJBFKKK',
      '..KKDDDDDDDZFKnK',
      '..KKdMMMMMMZKMmK',
      '.KKDDkDDkDD2KdUK',
      '.KKKKKKKKKKKKdWK'
    ];

    const harvest_down_0 = [
      '................',
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const harvest_down_1 = [
      '................',
      '................',
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYGAAgGYmKK..',
      'KKmYZaAaAaXZqXKK',
      '.KKyZsDDsZJJQK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const harvest_down_2 = [
      '.......KK.......',
      '......KAoK......',
      '..KKgXaAaAXgKK..',
      '..KKXsDDsXKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const pick_down_0 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymXKK',
      '.KKyJJJJJJJJJKXK',
      '..KKDDDDDDDDKKKK',
      '..KKdMMMMMMdKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const pick_down_1 = [
      '.......KKKKKKKKK',
      '......KAoKKXaK..',
      '...KKKKcKKKaK...',
      '..KKyyyyyyyyKDKK',
      '.KKYYYYYYYYYKKKK',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '..KKdMMMMMMdKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    const pick_down_2 = [
      '.......KK.......',
      '......KAoK......',
      '...KKKKcKKKK....',
      '..KKyyyyyyyyKK..',
      '.KKYYYYYYYYYYJK.',
      '.KKYZvvVVvvZYJK.',
      '.KKYZvVWvWVzYJK.',
      '.KKYjjjjjjjjJJK.',
      '..KKKKKKKKKKKK..',
      '.KKmYYYYYYYYmKK.',
      'KKmYdMaAaMdymKK.',
      '.KKyJJJJJJJJJKK.',
      '..KKDDDDDDDDKK..',
      '..KKdMMMMMMdKK..',
      '.KKDDkDDkDDkDDKK',
      '.KKKKKKKKKKKKKK.'
    ];

    // 3 Standalone Tool Sprites
    const tool_watering_can = [
      '................',
      '....KKKKKKKK....',
      '....KKnKKKnKK...',
      '....KKnCCCnKK...',
      '....KKnMMMnKK...',
      '...KKdYYYYYmKK..',
      '..KKdYYYYYYYmKK.',
      '..KKdYYAaYYYmKKK',
      '..KKdYYYYYYYmKnK',
      '..KKdYYYYYYYmKdK',
      '..KKdddddddddKUK',
      '...KKKKKKKKKKKWK',
      '.............KKK',
      '................',
      '................',
      '................'
    ];

    const tool_basket = [
      '.....KKKKKK.....',
      '.....KKmmKK.....',
      '....KKmKKmKK....',
      '....KKmKKmKKK...',
      '...KKmGAAgGmKK..',
      '..KKgXaAaAXgKKK.',
      '.KKgAYsDDsYAaGKK',
      'KKmYjYjYjYjYjYmK',
      'KKmjYjYjYjYjYjmK',
      'KKmYjYjYjYjYjYmK',
      'KKmjYjYjYjYjYjmK',
      '.KKmmmmmmmmmmKKK',
      '.KKKKKKKKKKKKKKK',
      '................',
      '................',
      '................'
    ];

    const tool_sickle = [
      '................',
      '......KKKKKK....',
      '....KKKKCCCKKK..',
      '...KKKCcVVKKK...',
      '..KKKCcVVdKK....',
      '.KKKCcVVdKK.....',
      '.KKCcVVdKK......',
      'KKKCcVVdK.......',
      'KKKCcVVdK.......',
      '.KKKcVdKK.......',
      '..KKKyyjK.......',
      '...KKKyjKK......',
      '....KKKjjKK.....',
      '.....KKKJKK.....',
      '......KKKK......',
      '................'
    ];

    this.createTexture(scene, 'player_walk_down_0', down_0, P);
    this.createTexture(scene, 'player_walk_down_1', down_1, P);
    this.createTexture(scene, 'player_walk_down_2', down_2, P);
    this.createTexture(scene, 'player_walk_up_0', up_0, P);
    this.createTexture(scene, 'player_walk_up_1', up_1, P);
    this.createTexture(scene, 'player_walk_up_2', up_2, P);
    this.createTexture(scene, 'player_walk_left_0', left_0, P);
    this.createTexture(scene, 'player_walk_left_1', left_1, P);
    this.createTexture(scene, 'player_walk_left_2', left_2, P);
    this.createTexture(scene, 'player_walk_right_0', right_0, P);
    this.createTexture(scene, 'player_walk_right_1', right_1, P);
    this.createTexture(scene, 'player_walk_right_2', right_2, P);

    this.createTexture(scene, 'player_water_down_0', water_down_0, P);
    this.createTexture(scene, 'player_water_down_1', water_down_1, P);
    this.createTexture(scene, 'player_water_down_2', water_down_2, P);
    this.createTexture(scene, 'player_harvest_down_0', harvest_down_0, P);
    this.createTexture(scene, 'player_harvest_down_1', harvest_down_1, P);
    this.createTexture(scene, 'player_harvest_down_2', harvest_down_2, P);
    this.createTexture(scene, 'player_pick_down_0', pick_down_0, P);
    this.createTexture(scene, 'player_pick_down_1', pick_down_1, P);
    this.createTexture(scene, 'player_pick_down_2', pick_down_2, P);

    this.createTexture(scene, 'tool_watering_can', tool_watering_can, P);
    this.createTexture(scene, 'tool_basket', tool_basket, P);
    this.createTexture(scene, 'tool_sickle', tool_sickle, P);

    // Legacy farmer0..3 aliases (matrix-era HUD/portrait keys).
    this.createTexture(scene, 'farmer0', down_0, P);
    this.createTexture(scene, 'farmer1', down_1, P);
    this.createTexture(scene, 'farmer2', down_0, P);
    this.createTexture(scene, 'farmer3', down_2, P);

    // Deprecated: catalog skin `chef` (art: matrix) + world costumeSkinId. HD chef is a later content PR.
    const CHEF = Object.assign({}, P, {
      h: 0xFFFFFF, t: 0xF8FAFC, T: 0xE2E8F0, i: 0xDC2626,
      D: 0xF8FAFC, d: 0xE2E8F0, S: 0xFFFFFF, s: 0xCBD5E1
    });
    this.createTexture(scene, 'chef_walk_down_0', down_0, CHEF);
    this.createTexture(scene, 'chef_walk_down_1', down_1, CHEF);
    this.createTexture(scene, 'chef_walk_down_2', down_2, CHEF);
    this.createTexture(scene, 'chef_walk_up_0', up_0, CHEF);
    this.createTexture(scene, 'chef_walk_up_1', up_1, CHEF);
    this.createTexture(scene, 'chef_walk_up_2', up_2, CHEF);
    this.createTexture(scene, 'chef_walk_left_0', left_0, CHEF);
    this.createTexture(scene, 'chef_walk_left_1', left_1, CHEF);
    this.createTexture(scene, 'chef_walk_left_2', left_2, CHEF);
    this.createTexture(scene, 'chef_walk_right_0', right_0, CHEF);
    this.createTexture(scene, 'chef_walk_right_1', right_1, CHEF);
    this.createTexture(scene, 'chef_walk_right_2', right_2, CHEF);

    // Register animations
    const anims = scene.anims;
    if (anims) {
      const reg = (key, frames, fps = 8) => {
        if (!anims.exists(key)) {
          anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: fps, repeat: -1 });
        }
      };
      reg('player-walk-down', ['player_walk_down_0', 'player_walk_down_1', 'player_walk_down_0', 'player_walk_down_2']);
      reg('player-walk-up', ['player_walk_up_0', 'player_walk_up_1', 'player_walk_up_0', 'player_walk_up_2']);
      reg('player-walk-left', ['player_walk_left_0', 'player_walk_left_1', 'player_walk_left_0', 'player_walk_left_2']);
      reg('player-walk-right', ['player_walk_right_0', 'player_walk_right_1', 'player_walk_right_0', 'player_walk_right_2']);
      reg('chef-walk-down', ['chef_walk_down_0', 'chef_walk_down_1', 'chef_walk_down_0', 'chef_walk_down_2']);
      reg('chef-walk-up', ['chef_walk_up_0', 'chef_walk_up_1', 'chef_walk_up_0', 'chef_walk_up_2']);
      reg('chef-walk-left', ['chef_walk_left_0', 'chef_walk_left_1', 'chef_walk_left_0', 'chef_walk_left_2']);
      reg('chef-walk-right', ['chef_walk_right_0', 'chef_walk_right_1', 'chef_walk_right_0', 'chef_walk_right_2']);

      const regOnce = (key, frames, fps = 6) => {
        if (!anims.exists(key)) {
          anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: fps, repeat: 0 });
        }
      };
      regOnce('player-water', ['player_water_down_0', 'player_water_down_1', 'player_water_down_2', 'player_water_down_1']);
      regOnce('player-harvest', ['player_harvest_down_0', 'player_harvest_down_1', 'player_harvest_down_2']);
      regOnce('player-pick', ['player_pick_down_0', 'player_pick_down_1', 'player_pick_down_2']);
    }
  }

  // 2. NPCs (Ginger Cat & Wizard)
  static _genNpcTextures(scene) {
    const C = {
      '.': null,
      'K': 0x0F172A, 'k': 0x121016,
      'H': 0xFBAE68, 'G': 0xEE7B28, 'g': 0xC86228, 'D': 0x9E3B0E, 'd': 0x782D00,
      'W': 0xFFFFFF, 'C': 0xFFF3E0, 'c': 0xF1F5F9, 'w': 0xCBD5E1,
      'P': 0xFFB3C1, 'p': 0xE67E90,
      'E': 0x55C655, 'I': 0x22C55E, 'e': 0x1E4A1E, 'L': 0xA3F0A3,
      'Z': 0x93C5FD, 'z': 0xBFDBFE
    };
    const cat_idle_0 = [
      '................',
      '...KPK.....KPK..',
      '..KHpKK...KHpKK.',
      '.KGddGGGGGGGddGK',
      '.KGdGGGGGGGGGdGK',
      '.KGWEILGGGEILWGK',
      'wKGCCCpPCCCgGKw.',
      '.KGGCCCCCCCCGGGK',
      '..KGDDCCCCDDGGK.',
      '..KGGCCCCCCGGK.K',
      '..KGgCCCCCCgGK.K',
      '..KDGCCCCCCDGGKK',
      '.KGDGGGGGGGGDDGK',
      '.KCCCCG....CCCCK',
      '.KCcCcK....KCcCc',
      '................'
    ];
    const cat_idle_1 = [
      '................',
      '...KPK.....KPK..',
      '..KHpKK...KHpKK.',
      '.KGddGGGGGGGddGK',
      '.KGdGGGGGGGGGdGK',
      '.KGeKkGGGGeKkGgK',
      'wKGCCCpPCCCgGKw.',
      '.KGGCCCCCCCCGGGK',
      '..KGDDCCCCCCDDGK',
      '..KGGCCCCCCCgK.K',
      '..KGgCCCCCCCgKK.',
      '..KDGCCCCCCDGGK.',
      '.KGDGGGGGGGGDDGK',
      '.KCCCCG....CCCCK',
      '.KCcCcK....KCcCc',
      '................'
    ];

    const cat_walk_0 = [
      '................',
      '..KPK.....KPK...',
      '.KHpKK...KHpKK..',
      'KGddGGGGGGGddGK.',
      'KGdGGGGGGGGGdGK.',
      'KGWEILGGGEILWGgK',
      'wGCCCPPCCCgGKw..',
      'KGGCCCCCCCCGGGK.',
      '.KGDDCCCCDDGGK..',
      '.KGGCCCCCCGGGK.K',
      '.KGgCCCCCCgGGKK.',
      '.KDGCCCCCCDGGK..',
      '..KCCCCG..KCCCCK',
      '..KCcCcK...KCcCc',
      '................',
      '................'
    ];
    const cat_walk_1 = [
      '...KPK.....KPK..',
      '..KHpKK...KHpKK.',
      '.KGddGGGGGGGddGK',
      '.KGdGGGGGGGGGdGK',
      '.KGWEILGGGEILWGK',
      'wKGCCCpPCCCgGKw.',
      '.KGGCCCCCCCCGGGK',
      '..KGDDCCCCDDGGK.',
      '..KGGCCCCCCGGGK.',
      '..KGgCCCCCCgGGK.',
      '..KDGCCCCCCDGGK.',
      '..KGDGGGGGGDDGK.',
      '...KCCCC..KCCCCK',
      '...KCcCc..KCcCcK',
      '................',
      '................'
    ];
    const cat_walk_2 = [
      '................',
      '....KPK.....KPK.',
      '...KHpKK...KHpKK',
      '..KGddGGGGGGGddG',
      '..KGdGGGGGGGGGDG',
      '..KGWEILGGGEILWG',
      '.wKGCCCPPCCCgGKw',
      '..KGGCCCCCCCCGGG',
      '...KGDDCCCCDDGGK',
      'K..KGGCCCCCCGGGK',
      'KK.KGgCCCCCCgGGK',
      '.K.KDGCCCCCCDGGK',
      'KCCCCK...KCCCCG.',
      'KCcCcK....KCcCcK',
      '................',
      '................'
    ];

    const cat_sit_0 = [
      '................',
      '....KPK...KPK...',
      '...KHpKK.KHpKK..',
      '..KGddGGGGddGK..',
      '..KGdGGGGGGGdGK.',
      '..KGWEILGGGEILGK',
      '.wKGCCCPPCCCgGKw',
      '..KGGCCCCCCCCGK.',
      '..KGDDCCCCDDGGK.',
      '.KGGCCCCCCCCGGGK',
      '.KGgCCCCCCCCgGGK',
      'KDGCCCCCCCCCgGGK',
      'KCCCCCCCgGGGGGGK',
      'KCcCcCcGGGGGGGK.',
      'KGGDDGGGGGGGGK..',
      '................'
    ];
    const cat_sit_1 = [
      '................',
      '...KpKK...KPK...',
      '..KHpKK..KHpKK..',
      '..KGddGGGGddGK..',
      '..KGdGGGGGGGdGK.',
      '..KGeKkGGGeEWGgK',
      '.wKGCCCPPCCCgGKw',
      '..KGGCCCCCCCCGK.',
      '..KGDDCCCCDDGGK.',
      '.KGGCCCCCCCCGGGK',
      '.KGgCCCCCCCCgGGK',
      'KDGCCCCCCCCCgGGK',
      'KCCCCCCCgGGGGGGK',
      'KCcCcCcGGGGGGGK.',
      '.KGGDDGGGGGGGK..',
      '................'
    ];

    const cat_sleep_0 = [
      '................',
      '................',
      '................',
      '................',
      '....KPK...KPK...',
      '...KHpKK.KHpKK..',
      '..KGddGGGGddGGK.',
      '.KGGeKkGGGeKkGGK',
      '.KGCCCCPCCCCGGGK',
      'KGGCCCCCCCCCCGGK',
      'KGDDCCCCCCCCDDGK',
      'KGGGGGGGGGGGGGGK',
      '.KGGDDGGGGGGDDGK',
      '..KGGGGGGGGGGGK.',
      '................',
      '................'
    ];
    const cat_sleep_1 = [
      '.........Z......',
      '........Z.......',
      '.......z........',
      '................',
      '....KPK...KPK...',
      '...KHpKK.KHpKK..',
      '..KGddGGGGddGGK.',
      '.KGGeKkGGGeKkGGK',
      '.KGCCCCPCCCCGGGK',
      'KGGGCCCCCCCCCGGK',
      'KGDDDCCCCCCDDDGK',
      'KGGGGGGGGGGGGGGK',
      '.KGGDDGGGGGGDDGK',
      '..KGGGGGGGGGGGK.',
      '................',
      '................'
    ];
    const cat_npc = cat_idle_0;

    this.createTexture(scene, 'cat_idle_0', cat_idle_0, C);
    this.createTexture(scene, 'cat_idle_1', cat_idle_1, C);
    this.createTexture(scene, 'cat_walk_0', cat_walk_0, C);
    this.createTexture(scene, 'cat_walk_1', cat_walk_1, C);
    this.createTexture(scene, 'cat_walk_2', cat_walk_2, C);
    this.createTexture(scene, 'cat_sit_0', cat_sit_0, C);
    this.createTexture(scene, 'cat_sit_1', cat_sit_1, C);
    this.createTexture(scene, 'cat_sleep_0', cat_sleep_0, C);
    this.createTexture(scene, 'cat_sleep_1', cat_sleep_1, C);
    this.createTexture(scene, 'cat_npc', cat_npc, C);

    const W_PAL = PixelArtRenderer.W_PAL;
    const wiz_0 = PixelArtRenderer.WIZ_0;
    const wiz_1 = PixelArtRenderer.WIZ_1;
    this.createTexture(scene, 'wizard_idle_0', wiz_0, W_PAL, 16, 20);
    this.createTexture(scene, 'wizard_idle_1', wiz_1, W_PAL, 16, 20);
    this.createTexture(scene, 'wizard_npc', wiz_0, W_PAL, 16, 20);

    const anims = scene.anims;
    if (anims) {
      const regCatAnim = (key, frames, frameRate, repeat = -1) => {
        if (!anims.exists(key)) {
          anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: frameRate, repeat: repeat });
        }
      };
      regCatAnim('cat-idle', ['cat_idle_0', 'cat_idle_1'], 3, -1);
      regCatAnim('cat-walk', ['cat_walk_0', 'cat_walk_1', 'cat_walk_2', 'cat_walk_1'], 6, -1);
      regCatAnim('cat-sit', ['cat_sit_0', 'cat_sit_1'], 3, -1);
      regCatAnim('cat-sleep', ['cat_sleep_0', 'cat_sleep_1'], 2, -1);

      if (!anims.exists('wizard-idle')) {
        anims.create({ key: 'wizard-idle', frames: [{ key: 'wizard_idle_0' }, { key: 'wizard_idle_1' }], frameRate: 3, repeat: -1 });
      }
    }
  }

  // 3. Farm Crops & Trees & Soils
  static _genCropAndTreeTextures(scene) {
    const P = {
      '.': null,
      'K': 0x121016, 'B': 0x451A03,
      'S': 0x5C3A21, 's': 0x8B5A2B, 'd': 0xA67C52,
      'L': 0x86EFAC, 'l': 0x4ADE80, 'G': 0x22C55E, 'g': 0x15803D,
      'H': 0xFDBA74, 'O': 0xF97316, 'o': 0xEA580C, 'D': 0x9A3412,
      'W': 0xF8FAFC, 'w': 0xCBD5E1, 'P': 0xF472B6, 'p': 0xDB2777,
      'X': 0xE6F4EA, 'C': 0xA7F3D0, 'c': 0x34D399, 'V': 0x059669,
      'Y': 0xFCA5A5, 'R': 0xEF4444, 'r': 0xB91C1C, 'U': 0x7F1D1D,
      'A': 0xFEF08A, 'a': 0xEAB308, 'b': 0xCA8A04, 'J': 0x854D0E,
      '*': 0xFFFFFF, '+': 0xFEF08A,
      'E': 0xEC4899, 'e': 0xBE185D, 'k': 0x78350F
    };

    // Soils
    const soil_tilled = [
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SssssssssssssssS',
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSS'
    ];
    const soil_watered = [
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'sBBBBBBBBBBBBBBs',
      'ssssssssssssssss',
      'ssssssssssssssss'
    ];
    const tile_grass = [
      'GGGGGGGGGGGGGGGG',
      'GGGGGAGGGGGGAGGG',
      'GGGGGGGGGGGGGGGG',
      'GGgGGGGGGGGgGGGG',
      'GGGGGGGGGGGGGGGG',
      'GAGGGGGGGGAGGGGG',
      'GGGGGGGGGGGGGGGG',
      'GGGGgGGGGGGGGgGG',
      'GGGGGGGGGGGGGGGG',
      'GGGAGGGGGGGAGGGG',
      'GGGGGGGGGGGGGGGG',
      'GGGGGGgGGGGGGGgG',
      'GGGGGGGGGGGGGGGG',
      'GGAGGGGGGGGAGGGG',
      'gggggggggggggggg',
      'gggggggggggggggg'
    ];

    this.createTexture(scene, 'tile_tilled_soil', soil_tilled, P);
    this.createTexture(scene, 'tile_watered_soil', soil_watered, P);
    this.createTexture(scene, 'tile_grass', tile_grass, P);
    this.createTexture(scene, 'drt_dry', soil_tilled, P);
    this.createTexture(scene, 'drt_wet', soil_watered, P);

    // Crop 1: Carrot (cr_0)
    const carrot_0=[
  '................',
  '................',
  '.....K...K......',
  '....KKKKKK......',
  '...KKGLGLK......',
  '....KGGGGK......',
  '....KgGGgK......',
  '....KSSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const carrot_1=[
  '......K.........',
  '.....KKK........',
  '....KKGKK.......',
  '...KKGLGKK......',
  '....KKGGK.......',
  '.....KGGK.......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const carrot_2=[
  '...KKKK.KKKK....',
  '..KKGLKKKLGKKK..',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KKGGGGGKK....',
  '....KKGGGGK.....',
  '.....KgOOgK.....',
  '....KKSOoSKKK...',
  '..KKKSSOoSSSKKK.',
  '.KKSSSdOoSSSSSKK',
  'KKSSSSSsOoSSSSSK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const carrot_3=[
  '..KKKKK.KKKKK...',
  '.KKLGLKKKLGLKKK.',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KKKGGGKKK....',
  '.....KHOHK......',
  '....KKOOOKK.....',
  '....KOOOOOK.....',
  '...KKOOOOOKK....',
  '...KKOOOOOKK....',
  '....KKOOOKK.....',
  '.....KKOKK......',
  '......KDK.......',
  '....KKKSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKKKKKKKKKKKKKK'
];

    // Crop 2: Radish (cr_1)
    const radish_0=[
  '................',
  '................',
  '.....K...K......',
  '....KKKKKK......',
  '...KKGLGLK......',
  '....KGGGGK......',
  '....KgGGgK......',
  '....KSSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const radish_1=[
  '....KKK.KKK.....',
  '...KKGKKKGKK....',
  '...KKGGKGGKK....',
  '....KKGGGKK.....',
  '.....KGGKK......',
  '.....KgGK.......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const radish_2=[
  '..KKKK...KKKK...',
  '.KKGLKK.KKGLKK..',
  '.KKGGGKKKGGGKK..',
  '..KKGGGGGGGKK...',
  '...KKKGGGKKK....',
  '.....KpPpK......',
  '....KKPWPKK.....',
  '....KSSWSSKK....',
  '..KKKSSWSSSKKK..',
  '.KKSSSdWSSSSSKKK',
  'KKSSSSSsSSSSSSSK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const radish_3=[
  '.KKKKK...KKKKK..',
  '.KLGLKK.KKGLGK..',
  '.KKGGGKKKGGGKK..',
  '..KKGGGGGGGKK...',
  '...KKKGGGKKK....',
  '.....KpPpK......',
  '....KKPWPKK.....',
  '...KKWWWWWKK....',
  '..KKWWWWWWWKK...',
  '..KKWWWWWWSKK...',
  '...KKWWWWSKK....',
  '....KKWWWKK.....',
  '.....KKSKK......',
  '......KwK.......',
  '....KKKSKKK.....',
  '..KKKKKKKKKKKKK.'
];

    // Crop 3: Cabbage (cr_2)
    const cabbage_0=[
  '................',
  '....K..K.K..K...',
  '...KKKKKKKKK....',
  '..KKKLKKKLGKK...',
  '....KKGKKGKK....',
  '.....KgKKKK.....',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const cabbage_1=[
  '...KKKK...KKKK..',
  '...KLLK...KLLK..',
  '..KKGLKKKKKLKK..',
  '...KKGGGGGGKK...',
  '....KKGGGKKK....',
  '.....KgGKK......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const cabbage_2=[
  '....KKKKKKKK....',
  '..KKKgGGGGgKKK..',
  '.KKCGGGGGGGGCKK.',
  'KKCGGGGGGGGGGCKK',
  'KCGGGGGGGGGGGGCK',
  'KKGGGGGGGGGGGGKK',
  '.KKCGGGGGGGGCKK.',
  '..KKKKGGGKKKKK..',
  '.....KgGKK......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKKKKKKKKKKKKK.'
];
    const cabbage_3=[
  '....KKKKKK......',
  '...KKCXXXKKKK...',
  '.KKKXCXXXXCXKKK.',
  'KKCXCCCCCCCCCXKK',
  'KCXCCCCcCCCCCCCK',
  'KCXCCCCcCcCCCCCK',
  'KCXCCCCcCcCCCCCK',
  'KCXCCCCcCCCCCCCK',
  'KKCXCCCCCCCCCXKK',
  '.KKKXCXXXXCXKKK.',
  '...KKCXXXXKKK...',
  '....KSSSSSK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKKKKKKKKKKKKKKK'
];

    // Crop 4: Pepper (cr_3)
    const pepper_0=[
  '................',
  '................',
  '.....K...K......',
  '....KKKKKK......',
  '...KKGLGLK......',
  '....KGGGGK......',
  '....KgGGgK......',
  '....KSSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const pepper_1=[
  '......K.........',
  '.....KKK........',
  '....KKGKK.......',
  '...KKGLGKK......',
  '....KKGGK.......',
  '.....KGGK.......',
  '.....KgGK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const pepper_2=[
  '...KKKK.KKKK....',
  '..KKGLKKKLGKKK..',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KKGG+gGKK....',
  '....KKGGGKK.....',
  '.....KgGgK......',
  '....KKSgSKKK....',
  '..KKKSSSSSSKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const pepper_3=[
  '..KKKKK.KKKKK...',
  '.KKLGLKKKLGLKKK.',
  '.KKGLGLGLGLGKK..',
  '..KKGGGGGGGKK...',
  '...KgGGKKKgK....',
  '...KgGKK.KKKKK..',
  '..KKgKK...KKGKK.',
  '.KKRYK.....KYRKK',
  '.KRrRK.....KRrKK',
  '.KRrRK.KK.KKrRK.',
  '.KKrKKKKKKKKKrKK',
  '..KKK.KRrKK.KKK.',
  '.....KKrKK......',
  '......KUK.......',
  '....KKKSKKK.....',
  '..KKKKKKKKKKKKK.'
];

    // Crop 5: Rice (cr_4)
    const rice_0=[
  '......K.........',
  '......KKK.......',
  '.....KKlK.......',
  '.....KLLK.......',
  '.....KLlK.......',
  '.....KlLK.......',
  '.....KgLK.......',
  '....KKSSKKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const rice_1=[
  '.....KKKKK......',
  '....KKlLlK......',
  '...KKLLLLKK.....',
  '....KKlLlLK.....',
  '.....KLLLLK.....',
  '.....KlLlLK.....',
  '.....KgLlLK.....',
  '....KKSSSSK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const rice_2=[
  '...KKKKKKKKKK...',
  '..KKlLlLlLlLKK..',
  '.KKLLLLLLLLLLKK.',
  '..KKlLlLlLlLKK..',
  '...KKGGGGGGKK...',
  '....KKGGGGKK....',
  '.....KgGGgK.....',
  '....KKSSSSK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSKK.',
  '..KKKSSSSSSSKK..',
  '....KKSSSSSKK...',
  '.....KKKKKKK....'
];
    const rice_3=[
  '..KKKKKKKKKKK...',
  '.KKAAKAaAKAAKK..',
  '.KKAAAaAaAAAKK..',
  '..KKAbAbAbAKK...',
  '...KKAbAbAKK....',
  '....KKAbAKK.....',
  '.....KJJJK......',
  '.....KJJJK......',
  '.....KgJgK......',
  '....KKSSSKK.....',
  '..KKKSSSSSKKKKK.',
  '.KKSSSdSSSSSSSK.',
  'KKSSSSSsSSSSSSKK',
  'KKSSSSSSSSSSSSKK',
  '.KKSSSSSSSSSSSK.',
  '..KKKKKKKKKKKKK.'
];

    const cropList = [
      { name: 'carrot', cr: 'cr_0', s0: carrot_0, s1: carrot_1, s2: carrot_2, s3: carrot_3 },
      { name: 'radish', cr: 'cr_1', s0: radish_0, s1: radish_1, s2: radish_2, s3: radish_3 },
      { name: 'cabbage', cr: 'cr_2', s0: cabbage_0, s1: cabbage_1, s2: cabbage_2, s3: cabbage_3 },
      { name: 'pepper', cr: 'cr_3', s0: pepper_0, s1: pepper_1, s2: pepper_2, s3: pepper_3 },
      { name: 'rice', cr: 'cr_4', s0: rice_0, s1: rice_1, s2: rice_2, s3: rice_3 }
    ];

    cropList.forEach((c) => {
      this.createTexture(scene, 'crop_' + c.name + '_0', c.s0, P);
      this.createTexture(scene, 'crop_' + c.name + '_1', c.s1, P);
      this.createTexture(scene, 'crop_' + c.name + '_2', c.s2, P);
      this.createTexture(scene, 'crop_' + c.name + '_3', c.s3, P);

      // Legacy aliases cr_X_0..3
      this.createTexture(scene, c.cr + '_0', c.s0, P);
      this.createTexture(scene, c.cr + '_1', c.s1, P);
      this.createTexture(scene, c.cr + '_2', c.s2, P);
      this.createTexture(scene, c.cr + '_3', c.s3, P);
    });

    const straw_0=[
      '................','................','................','......KK.......',
      '.....KGLK.......','......KgK.......','......KSK.......','.....KSSS......',
      '....KSSSSK......','...KKSSSSKK.....','...KSSSdSSK.....','....KKSSSK......',
      '.....KKKKK......','................','................','................'
    ];
    const straw_1=[
      '................','......K.K.......','.....KLGLK......','.....KGGGK......',
      '......KgK.......','.....KSSSK......','....KSSSSSK.....','...KKSYYSSKK....',
      '..KKSSYRYSSKK...','..KSSSYYYSSSK...','...KKSSSSSKK....','....KKSSSKK.....',
      '.....KKKKK......','................','................','................'
    ];
    const straw_2=[
      '......K.K.......','.....KLGLK......','....KKGGGKK.....','.....KgGGgK.....',
      '......KgK.......','.....KSSSK......','...KKSYRYSKK....','..KKSYRRRYSKK...',
      '.KKSSYRRRYSSKK..','.KSSSYR*RYSSSK..','..KKSSYRYSSKK...','...KKSSSSSKK....',
      '....KKSSSKK.....','.....KKKKK......','................','................'
    ];
    const straw_3=[
      '.....KLKLK......','....KKGLGKK.....','...KKGGGGGKK....','....KgGGGgK.....',
      '.....KgGgK......','....KKSSSKK.....','...KSYRRYSK.....','..KKYRRRRYKK....',
      '.KKSYR*RRYSKK...','.KSSYR*RRYSSK...','..KKYRRRRYKK....','...KSYRRYSK.....',
      '....KKSSSKK.....','.....KKKKK......','................','................'
    ];
    const corn_0=[
      '................','................','......KK.......','.....KGLK.......',
      '.....KGGLK......','......KgK.......','......KSK.......','.....KSSSK......',
      '....KSSSSK......','...KKSSSSKK.....','...KSSSdSSK.....','....KKSSSK......',
      '.....KKKKK......','................','................','................'
    ];
    const corn_1=[
      '......KK........','.....KLGK.......','....KKGLKK......','....KGGGGK......',
      '.....KgGgK......','......KgK.......','.....KSSSK......','....KSSSSSK.....',
      '...KKSSSSSKK....','..KKSSSdSSSKK...','..KSSSSSSSSSK...','...KKSSSSSKK....',
      '....KKSSSKK.....','.....KKKKK......','................','................'
    ];
    const corn_2=[
      '.....KLKLK......','....KKGLGKK.....','...KKGGGGGKK....','....KgGGGgK.....',
      '.....KGGGK......','......KgK.......','.....KgAgK......','....KKAaAKK.....',
      '...KKSAAaSSKK...','..KKSSAaASSKK...','..KSSSSSSSSSK...','...KKSSSSSKK....',
      '....KKSSSKK.....','.....KKKKK......','................','................'
    ];
    const corn_3=[
      '....KLKLKLK.....','...KKGLGLGKK....','..KKGGGGGGGKK...','...KgGGGGGgK....',
      '....KGGGGGK.....','.....KgGgK......','.....KAAaK......','....KKAaAKK.....',
      '...KKSA*ASSKK...','..KKSSAAaSSKK...','..KSSSAAaSSSK...','...KKSSSSSKK....',
      '....KKSSSKK.....','.....KKKKK......','................','................'
    ];
    const sun_0=[
      '................','................','................','......KK.......',
      '.....KGLK.......','......KgK.......','......KgK.......','......KSK.......',
      '.....KSSSK......','....KSSSSSK.....','...KKSSSSSKK....','....KKSSSKK.....',
      '.....KKKKK......','................','................','................'
    ];
    const sun_1=[
      '................','......KK........','.....KGLK.......','.....KGGLK......',
      '......KgK.......','......KgK.......','......KgK.......','......KSK.......',
      '.....KSSSK......','....KSSSSSK.....','...KKSSSSSKK....','....KKSSSKK.....',
      '.....KKKKK......','................','................','................'
    ];
    const sun_2=[
      '.....KAAAK......','....KAaAaAK.....','.....KAJAK......','......KgK.......',
      '......KgK.......','......KgK.......','......KgK.......','......KSK.......',
      '.....KSSSK......','....KSSSSSK.....','...KKSSSSSKK....','....KKSSSKK.....',
      '.....KKKKK......','................','................','................'
    ];
    const sun_3=[
      '...KAAAKAAAK....','..KAAaAaAaAaAK..','.KAaAAAAAAAAaAK.','..KAAAAJAAAAK...',
      '...KAAJAJAAK....','....KKKgKKK.....','......KgK.......','......KgK.......',
      '......KgK.......','.....KSSSK......','....KSSSSSK.....','...KKSSSSSKK....',
      '....KKSSSKK.....','.....KKKKK......','................','................'
    ];
    const pad16 = (rows) => rows.map((r) => (r + '................').slice(0, 16));
    this.createTexture(scene, 'crop_strawberry_0', pad16(straw_0), P);
    this.createTexture(scene, 'crop_strawberry_1', pad16(straw_1), P);
    this.createTexture(scene, 'crop_strawberry_2', pad16(straw_2), P);
    this.createTexture(scene, 'crop_strawberry_3', pad16(straw_3), P);
    this.createTexture(scene, 'crop_corn_0', pad16(corn_0), P);
    this.createTexture(scene, 'crop_corn_1', pad16(corn_1), P);
    this.createTexture(scene, 'crop_corn_2', pad16(corn_2), P);
    this.createTexture(scene, 'crop_corn_3', pad16(corn_3), P);
    this.createTexture(scene, 'crop_sunflower_0', pad16(sun_0), P);
    this.createTexture(scene, 'crop_sunflower_1', pad16(sun_1), P);
    this.createTexture(scene, 'crop_sunflower_2', pad16(sun_2), P);
    this.createTexture(scene, 'crop_sunflower_3', pad16(sun_3), P);

    // Apple trees
    const tree_summer=[
  '...KKKKKKKKKK...',
  '.KKKGGGGGGGGKKK.',
  'KKGGGRGGGGGRGGKK',
  'KGGGRRRGGGGGRRRK',
  'KGGGGGGGGGGGGGGK',
  'KGGGRRRGGGGGRRRK',
  'KKGGGRGGGGGRGGKK',
  '.KKKGGGGGGGGKKK.',
  '...KKKKGGKKKK...',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '.....KKBBKK.....',
  '....KKKKKKKK....'
];
    const tree_bare=[
  '......KKKK......',
  '....KKKKKKKK....',
  '...KKBK..KBKK...',
  '...KKKK..KKKK...',
  '.....KKKKKK.....',
  '.....KKBBKK.....',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '......KBBK......',
  '.....KKBBKK.....',
  '....KKKKKKKK....'
];

    this.createTexture(scene, 'tree_apple_summer', tree_summer, P);
    this.createTexture(scene, 'tree_apple_bare', tree_bare, P);
    this.createTexture(scene, 'apple_tree', tree_summer, P);
    this.createTexture(scene, 'apple_tree_ripe', tree_summer, P);
  }

  // 4. Fishing Scene Textures
  static _genFishingTextures(scene) {
    const P = {
      '.': null,       // Transparent
      'K': 0x0F172A,   // 1px Dark Slate Outline
      'k': 0x1E293B,   // Secondary Outline / Fin Shadow
      'R': 0xEF4444,   // Bobber Red Cap / Red accent
      'r': 0x991B1B,   // Deep Red Shadow
      'W': 0xFFFFFF,   // Specular White Eye/Scale Highlight
      'w': 0xF1F5F9,   // Belly White/Cream
      'Y': 0xFDE047,   // Bright Gold / Yellow
      'y': 0xD97706,   // Gold Shadow / Amber
      'Z': 0xF59E0B,   // Carp Bronze / Orange Base
      'z': 0xB45309,   // Deep Bronze Shadow
      'S': 0xFB923C,   // Salmon Coral / Pink-Orange
      's': 0xEA580C,   // Salmon Mid Shadow
      'H': 0xFFEDD5,   // Salmon Belly Light
      'h': 0xC2410C,   // Salmon Deep Shadow
      'U': 0x2563EB,   // Tuna Royal Blue
      'u': 0x1D4ED8,   // Tuna Dark Blue
      'B': 0x60A5FA,   // Tuna Light Blue Highlight
      'V': 0x1E3A8A,   // Tuna Navy Shadow
      'Q': 0xF472B6,   // Squid Pink
      'q': 0xDB2777,   // Squid Deep Pink
      'E': 0xFBCFE8,   // Squid Light Highlight
      'I': 0xC084FC,   // Squid Purple Iridescence
      'N': 0x475569,   // Eel Slate Grey / Wood Iron
      'n': 0x334155,   // Eel Dark Slate
      'm': 0x94A3B8,   // Eel Light Slate
      'F': 0xFF6B00,   // Goldfish Flame Orange
      'f': 0xD94600,   // Goldfish Deep Orange
      'G': 0xFFBE98,   // Goldfish Tail Fin Light
      'g': 0xFFD000,   // Goldfish Gold Accent
      'M': 0x64748B,   // Seabass Grey Base
      'T': 0x94A3B8,   // Seabass Light Grey
      't': 0x0EA5E9,   // Seabass Blue Shimmer
      'P': 0xF87171,   // Shrimp Coral Pink
      'p': 0xDC2626,   // Shrimp Red Base
      'X': 0xFECACA,   // Shrimp Light Pink Shell
      'O': 0xE11D48,   // Octopus Crimson Base
      'o': 0x9F1239,   // Octopus Dark Crimson Shadow
      'C': 0xFFE4E6,   // Octopus Suction Cup Cream / Rod Ring
      'c': 0xFB7185,   // Octopus Pink Accent
      'A': 0x4B5563,   // Catfish Mud Olive Base
      'a': 0x1F2937,   // Catfish Dark Shadow
      'e': 0x6B7280,   // Catfish Mid Grey
      'L': 0x9333EA,   // Legendary Purple
      'l': 0x6D28D9,   // Legendary Dark Purple
      'j': 0xEAB308,   // Legendary Gold Shimmer
      'D': 0x8F5428,   // Wood Base
      'd': 0x573012,   // Wood Shadow
      'x': 0xD99B66    // Wood Highlight
    };

    const carp = [
      '................',
      '.....KKKK.......',
      '...KKYZYYKK.....',
      '..KKYZZZYYYKK...',
      '.KKYZZZZYYYYYKK.',
      'KKYZZKZZYYYYYYyK',
      'KyzzzzWWWWWWWWyk',
      'Kyzzzzzzzzzzzzyk',
      '.Kyzzzzzzzzzzk..',
      '..Kyzzzzzzzyk...',
      '....Kyzzzzk.....',
      '.....KKKKK......',
      '................',
      '................',
      '................',
      '................'
    ];
    const salmon = [
      '................',
      '.....KKKK.......',
      '...KKSSSHKK.....',
      '..KKSSSKSSSSKK..',
      '.KKSSSWSSSSSSSKS',
      'KSsssssWWWWWWWhs',
      'KSsssssssssssssh',
      '.KSsssssssssssh.',
      '..KSsssssssssk..',
      '....KSsssssk....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const tuna = [
      '................',
      '.....KKKK.......',
      '...KKUUUBKK.....',
      '..KKUUUKUUUUKK..',
      '.KKUUUWUUUUUUUVY',
      'KUuuuuuWWWWWWWWu',
      'KUuuuuuuuuuuuuuu',
      '.KUuuuuuuuuuuuu.',
      '..KUuuuuuuuuuu..',
      '....KUuuuuuu....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const squid = [
      '.....KKKKKK.....',
      '...KKEEEEEEKK...',
      '..KKQQQQQQQQKK..',
      '.KKQQQKWWKQQQKK.',
      '.KKQQQQQQQQQQKK.',
      '..KKQQQQQQQQKK..',
      '...KKqIqIqIKK...',
      '....KKqqqqKK....',
      '.....Kq..qK.....',
      '.....Kq..qK.....',
      '....Kq....qK....',
      '....Kq....qK....',
      '................',
      '................',
      '................',
      '................'
    ];
    const eel = [
      '................',
      '...KKKKKK.......',
      '..KNNNmNNNKK....',
      '.KNNNKNNNNNNKK..',
      'KNNNNwWWWWNNNNK.',
      '.KNnnnnnnnnnNNK.',
      '..KKNnnnnnnnKK..',
      '....KKNnnnnKK...',
      '......KKNNKK....',
      '........KK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const goldfish = [
      '.....KKKK.......',
      '...KKFFFFKK.....',
      '..KKFFFKFFFFKK..',
      '.KKFFFWFFFFFFFGG',
      'KFFFFffWWWWFFFGG',
      'KfffffffffffffGG',
      '.KffffffffffgG..',
      '..KfffffffffGG..',
      '....Kffffffk....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const seabass = [
      '.....KKKK.......',
      '...KKMMMTKK.....',
      '..KKMMMKMMMMKK..',
      '.KKMMMtWMMMMMMKM',
      'KMmmmmmWWWWWWWWm',
      'KMmmmmmmmmmmmmmm',
      '.KMmmmmmmmmmmmm.',
      '..KMmmmmmmmmmm..',
      '....KMmmmmmm....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const shrimp = [
      '.....KKKK.......',
      '...KKPPPPKK.....',
      '..KKPPPKWWWWKK..',
      '.KKPPPPPPPPPPKK.',
      '..KKXXXXXXXXKK..',
      '...KKppppppKK...',
      '....KKppppKK....',
      '.....KKppKK.....',
      '......KKKK......',
      '.......VV.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const octopus = [
      '.....KKKKKK.....',
      '...KKOOOOOOKK...',
      '..KKOOOKWWOOKK..',
      '.KKOOOOOOOOOOKK.',
      '.KKOOOOOOOOOOKK.',
      '..KKOOOOOOOOKK..',
      '..Ko.oCo..oCo.o.',
      '..Ko.oCo..oCo.o.',
      '.Ko..oCo..oCo..o',
      '.K...k...k...K..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const catfish = [
      '.....KKKK.......',
      '...KKAAAAKK.....',
      '..KKAAAKAAAAKK..',
      'WKKAAAAEAAAAAAKA',
      'WKAaaaaWWWWWWWWa',
      '.KAaaaaaaaaaaaaa',
      '.KAaaaaaaaaaaaa.',
      '..KAaaaaaaaaaa..',
      '....KAaaaaaa....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const mackerel = [
      '.....KKKK.......',
      '...KKKKKKKK.....',
      '..KKKZZKZZKK....',
      '.KKZZZWZZZZZZZKM',
      'KKkkkkkWWWWWWWWk',
      'KKWWWWWWWWWWWWWW',
      '.KkWkWkWkWkWkWk.',
      '..Kkkkkkkkkkkk..',
      '....Kkkkkkkk....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const legendary = [
      '.....KKKKKK.....',
      '...KKKLLLLKKK...',
      '..KKLLLKLLLLKKK.',
      '.KKLLLLWLLLLLLKK',
      'KKLLLLLLWWWWWWWK',
      'KlllllllWWWWWWWK',
      'KKlllllljjjjjjKK',
      '.KKlllljjjjjjKK.',
      '..KKKlllljjKKK..',
      '....KKllllKK....',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const clam = [
      '.....KKKKKK.....',
      '...KKEEQQQQKK...',
      '..KKWWEEQQqqKK..',
      '.KKWWEEQKWWqqKK.',
      '.KKWWEEQQWWqqKK.',
      '..KKEEQQqqqqKK..',
      '...KKqqqqqqKK...',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // Canonical Fish Textures
    this.createTexture(scene, 'fish_carp', carp, P);
    this.createTexture(scene, 'fish_salmon', salmon, P);
    this.createTexture(scene, 'fish_tuna', tuna, P);
    this.createTexture(scene, 'fish_squid', squid, P);
    this.createTexture(scene, 'fish_eel', eel, P);
    this.createTexture(scene, 'fish_goldfish', goldfish, P);
    this.createTexture(scene, 'fish_seabass', seabass, P);
    this.createTexture(scene, 'fish_shrimp', shrimp, P);
    this.createTexture(scene, 'fish_octopus', octopus, P);
    this.createTexture(scene, 'fish_catfish', catfish, P);
    this.createTexture(scene, 'fish_mackerel', mackerel, P);

    // Legacy Aliases for fishing scene parity
    this.createTexture(scene, 'fishing_carp', carp, P);
    this.createTexture(scene, 'fishing_salmon', salmon, P);
    this.createTexture(scene, 'fishing_tuna', tuna, P);
    this.createTexture(scene, 'fishing_squid', squid, P);
    this.createTexture(scene, 'fishing_eel', eel, P);
    this.createTexture(scene, 'fishing_golden_fish', goldfish, P);
    this.createTexture(scene, 'fishing_snapper', seabass, P);
    this.createTexture(scene, 'fishing_shrimp', shrimp, P);
    this.createTexture(scene, 'fishing_octopus', octopus, P);
    this.createTexture(scene, 'fishing_catfish', catfish, P);
    this.createTexture(scene, 'fishing_mackerel', mackerel, P);
    this.createTexture(scene, 'fishing_legendary', legendary, P);
    this.createTexture(scene, 'fishing_clam', clam, P);

    // Dock tiles & bobber & rod
    const dock_plank = [
      'KKKKKKKKKKKKKKKK',
      'KOOOOOOOOOOOOOOK',
      'KOOWWWWWWWWWWOOK',
      'KKwWWWWWWWWWWwKK',
      'KKKKKKKKKKKKKKKK',
      'KN..N......N..NK',
      'KN..N......N..NK',
      'KKKKKKKKKKKKKKKK',
      'KOOOOOOOOOOOOOOK',
      'KOOWWWWWWWWWWOOK',
      'KKwWWWWWWWWWWwKK',
      'KKKKKKKKKKKKKKKK',
      'KN..N......N..NK',
      'KN..N......N..NK',
      'KKKKKKKKKKKKKKKK',
      'KKKKKKKKKKKKKKKK'
    ];
    const dock_post = [
      '.....KKKK.......',
      '.....KxDdK......',
      '.....KxNdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxNdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KxDdK......',
      '.....KKKK.......'
    ];
    const bobber = [
      '.....KKKKKK.....',
      '....KKRRRRKK....',
      '...KKRRRRrrKK...',
      '..KKRRRRrrrrKK..',
      '..KKWWWWWWWWKK..',
      '...KKWWWWwwKK...',
      '....KKWWwwKK....',
      '.....KKwwKK.....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];
    const rod = [
      '.............KCK',
      '............KEK.',
      '...........KCK..',
      '..........KCK...',
      '.........KBK....',
      '........KCK.....',
      '.......KCK......',
      '......KCK.......',
      '.....KxK........',
      '....KDK.........',
      '...KdK..........',
      '..KDK...........',
      '.KdK............',
      'KDK.............',
      'KdK.............',
      'KK..............'
    ];

    this.createTexture(scene, 'dock_plank', dock_plank, P);
    this.createTexture(scene, 'dock_post', dock_post, P);
    this.createTexture(scene, 'fishing_dock', dock_plank, P);
    this.createTexture(scene, 'fishing_bobber', bobber, P);
    this.createTexture(scene, 'fishing_rod', rod, P);
  }

  // 5. Arcade Scene Textures
  static _genArcadeTextures(scene) {
    // 10. Player Ship Palette & Matrix
    const P_SHIP = {
      '.': null,
      'K': 0x0F172A, 'd': 0x0369A1, 'D': 0x0369A1, 'S': 0x0284C7, 'L': 0x38BDF8,
      'C': 0x06B6D4, 'A': 0x67E8F9, 'W': 0xE0F2FE, 'R': 0xEF4444,
      'O': 0xF97316, 'Y': 0xFDE047
    };
    const ship = [
      '.......KK.......',
      '......KWWK......',
      '......KAAK......',
      '.....KCAACK.....',
      '.....KLLLSK.....',
      '....KLLSSSDK....',
      '...KSLSSSSSDK...',
      '..KSLLSSSSSSDK..',
      '.KSSLLCCCCCCSSK.',
      'KRSSSK.WW.KSSSRK',
      'KRRSSK.KK.KSSRRK',
      'KKKSSK....KSSKKK',
      '..KOYK....KOYK..',
      '..KOOK....KOOK..',
      '...KK......KK...',
      '................'
    ];

    // 11. Alien Scout
    const P_SCOUT = {
      '.': null,
      'K': 0x0F172A, 'd': 0x052E16, 'g': 0x16A34A, 'G': 0x4ADE80,
      'H': 0x86EFAC, 'C': 0x06B6D4, 'R': 0xEF4444, 'Y': 0xFDE047,
      'W': 0xFFFFFF
    };
    const scout = [
      '..CK........KC..',
      '.CKK..KKKK..KKC.',
      '..KKdKGGGGKdKK..',
      '..KGGGHHHHGGGK..',
      '.KGGgGGGGGGgGGK.',
      'KGgKKYYYYYYKKgGK',
      'KGgKYYRWWRYYKgGK',
      'KGgKYYRRRRYYKgGK',
      '.KGGKYYYYYYKGGK.',
      '..KGGgGGGGgGGK..',
      '...KGGGGGGGGK...',
      '....KGgddgGK....',
      '....KCK..KCK....',
      '.....KK..KK.....',
      '................',
      '................'
    ];

    // 12. Alien Shooter
    const P_SHOOTER = {
      '.': null,
      'K': 0x0F172A, 'd': 0x3B0764, 'p': 0x6B21A8, 'P': 0x9333EA,
      'H': 0xC084FC, 'M': 0xEC4899, 'B': 0xF472B6, 'E': 0xFDE047,
      'W': 0xFFFFFF
    };
    const shooter = [
      '......KKKK......',
      '....KKHHHHKK....',
      '..KKPPHHHHPPKK..',
      '.KMKPPHPPPHPPKMK',
      '.KMBKPPEEEPPBKMK',
      '.KMBKPWWEWWPKMB.',
      '.KMPKPEEEEEPKPM.',
      '.KMPPKPPPPPKPPMK',
      '..KKPppPPPppKK..',
      '...KKpPPPPpKK...',
      '....KKppddppKK..',
      '.....KKKKKK.....',
      '................',
      '................',
      '................',
      '................'
    ];

    // 13. Alien Elite
    const P_ELITE = {
      '.': null,
      'K': 0x0F172A, 'd': 0x431407, 'o': 0x9A3412, 'O': 0xEA580C,
      'Y': 0xFB923C, 'F': 0xFDE047, 'C': 0x06B6D4, 'A': 0x67E8F9,
      'W': 0xFFFFFF
    };
    const elite = [
      'KFK..........KFK',
      'KAFK........KFAK',
      '.KCYK......KYCK.',
      '..KYYK....KYYK..',
      '..KYYYYYYYYYYK..',
      '.KYYYOOOOOOYYYK.',
      '.KYYKCAAAACKYYK.',
      '.KYYKCAWWACKYYK.',
      '.KYYKCAAAACKYYK.',
      '.KYYOOOOOOOOYYK.',
      '..KdOOOOOOOOdK..',
      '...KdOOOOOOdK...',
      '....KFFKKFFK....',
      '....KK....KK....',
      '................',
      '................'
    ];

    // 14. Alien Boss (Dreadnought)
    const P_BOSS = {
      '.': null,
      'K': 0x0F172A, 'd': 0x500724, 'b': 0x881337, 'r': 0xBE123C,
      'R': 0xE11D48, 'H': 0xFB7185, 'G': 0x22C55E, 'P': 0xA855F7,
      'Y': 0xFDE047, 'W': 0xFFFFFF
    };
    const boss = [
      '..KKKKKKKKKKKK..',
      '.KRRHHHHHHHHRRK.',
      'KRRRRRRRRRRRRRRK',
      'KRRRKGKRRRKGKRRK',
      'KRRRKGKRRRKGKRRK',
      'KRRRKKKKKKKKRRRK',
      '.KRRRRKPPKRRRRK.',
      '.KRRRKPWWPKRRRK.',
      '..KRRRKPPKRRRK..',
      '..KRRRRRRRRRRK..',
      '.KbRbRRRRRRbRbK.',
      'KbRbKYYKYYKbRbK.',
      'KbRbKYYKYYKbRbK.',
      '.KKbKKKKKKKKbKK.',
      '...KK......KK...',
      '................'
    ];

    // 15. Laser Player
    const P_LASER = {
      '.': null,
      'K': 0x0F172A, 'd': 0x083344, 'C': 0x06B6D4, 'A': 0x38BDF8,
      'B': 0x67E8F9, 'W': 0xFFFFFF
    };
    const laser = [
      '.....KK....KK...',
      '....KABK..KABK..',
      '....KAWK..KAWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KCWK..KCWK..',
      '....KAWK..KAWK..',
      '....KABK..KABK..',
      '.....KK....KK...',
      '................'
    ];

    // 16. Powerup Weapon
    const P_PW_WEAPON = {
      '.': null,
      'K': 0x0F172A, 'd': 0x451A03, 'y': 0xCA8A04, 'Y': 0xEAB308,
      'E': 0xFDE047, 'R': 0xEF4444, 'r': 0x991B1B, 'W': 0xFFFFFF
    };
    const pw_weapon = [
      '......KKKK......',
      '....KKEEEEKK....',
      '...KEEWWEEEEK...',
      '..KEEEKRRKEEEYK.',
      '.KEEEErRRrEEEEYK',
      '.KEEEErRRrEEEEYK',
      '.KEEEErRRrEEEEYK',
      '..KEEEKRRKEEEYK.',
      '...KYYEEEEYYYK..',
      '....KKYYYYKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 17. Powerup Shield
    const P_PW_SHIELD = {
      '.': null,
      'K': 0x0F172A, 'd': 0x0C4A6E, 's': 0x0284C7, 'S': 0x38BDF8,
      'C': 0xBAE6FD, 'w': 0xE0F2FE, 'W': 0xFFFFFF
    };
    const pw_shield = [
      '......KKKK......',
      '....KKCCCCKK....',
      '...KCCWWCCCCK...',
      '..KCCSSWWSSCCCK.',
      '.KCCSSSSWWSSCSCK',
      '.KCSSSSSSSSSSSCK',
      '.KCSSSSSSSSSSSCK',
      '..KCSSSSssssSCK.',
      '...KSSSSssssSK..',
      '....KKssssKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 18. Powerup Nuke
    const P_PW_NUKE = {
      '.': null,
      'K': 0x0F172A, 'd': 0x450A0A, 'r': 0x991B1B, 'R': 0xDC2626,
      'a': 0xF87171, 'Y': 0xFDE047, 'W': 0xFFFFFF
    };
    const pw_nuke = [
      '......KKKK......',
      '....KKaaaaKK....',
      '...KaaWWaaaaK...',
      '..KaaYYKKYYaaK..',
      '.KaaYYYYYYYYaaK.',
      '.KaaYYKKKKYYaaK.',
      '.KaaRKKYYKKRaaK.',
      '..KaaRRKKRRaaK..',
      '...KaaRRRRaaK...',
      '....KKRRRRKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'arcade_player_ship', ship, P_SHIP);
    this.createTexture(scene, 'alien_scout', scout, P_SCOUT);
    this.createTexture(scene, 'alien_shooter', shooter, P_SHOOTER);
    this.createTexture(scene, 'alien_elite', elite, P_ELITE);
    this.createTexture(scene, 'alien_boss', boss, P_BOSS);
    this.createTexture(scene, 'laser_player', laser, P_LASER);
    this.createTexture(scene, 'powerup_weapon', pw_weapon, P_PW_WEAPON);
    this.createTexture(scene, 'powerup_shield', pw_shield, P_PW_SHIELD);
    this.createTexture(scene, 'powerup_nuke', pw_nuke, P_PW_NUKE);
  }

  // 6. Dungeon Scene Textures
  static _genDungeonTextures(scene) {
    // 1. Slime
    const P_SLIME = {
      '.': null, 'K': 0x0F172A, 'd': 0x064E3B, 's': 0x059669,
      'G': 0x10B981, 'g': 0x34D399, 'H': 0xA7F3D0, 'Y': 0xFDE047,
      'W': 0xFFFFFF, 'D': 0x0F172A
    };
    const slime = [
      '.....KKKKKK.....',
      '...KKGGGGGGKK...',
      '..KGGgHHHHgGGK..',
      '.KGGgHYWYHYWgGK.',
      '.KGsHYDYHYDYsGK.',
      '.KGssgHHgHHgssGK',
      '.KGGssgGGgssGGK.',
      '.KGGGGsGGsGGGGK.',
      '..KGGGssssGGGK..',
      '...KKGGGGGGKK...',
      '....KGsddsGK....',
      '.....KdsddK.....',
      '......KdK.......',
      '................',
      '................',
      '................'
    ];

    // 2. Skeleton Archer
    const P_SKELETON = {
      '.': null, 'K': 0x0F172A, 'd': 0x1C1917, 'b': 0x78716C,
      'B': 0xD6D3D1, 'W': 0xF5F5F4, 'R': 0xEF4444, 'S': 0x78350F,
      'y': 0xD97706, 'M': 0x94A3B8, 'm': 0x64748B
    };
    const skeleton = [
      '.....KKKKKK.....',
      '...KKWWWWWWKK...',
      '..KWWbWWbWWWWK..',
      '.KWWKRKWKRKWWWK.',
      '.KWWKKKKKKKWWWK.',
      '..KWbWbWbWbWWK..',
      '...KKWWWWWWKK...',
      '....KSBBBBBSK.M.',
      '...KSBBWWWBBSSM.',
      '..KSBBWKKKWBSmS.',
      '.KSBBWK...KWBSmS',
      'KSyBBK....KWBSmS',
      'KSyBK......KBSmS',
      '.KSK.......KK.S.',
      '................',
      '................'
    ];

    // 3. Goblin Warrior
    const P_GOBLIN = {
      '.': null, 'K': 0x0F172A, 'd': 0x052E16, 'e': 0x14532D,
      'E': 0x16A34A, 'H': 0x4ADE80, 'm': 0x334155, 'M': 0x64748B,
      'w': 0xCBD5E1, 'R': 0xDC2626, 'W': 0xFFFFFF
    };
    const goblin = [
      '....KKK..KKK....',
      '...KEEEKKEEEK...',
      '..KEEHKEEKHEEK..',
      '.KEEERREEEERRKEK',
      '.KEEEEKKEEKKEEEK',
      '..KEEEWWWWEEEK..',
      '...KEEEEEEEEK...',
      '..KKMMMMMMMMKK..',
      '.KMMMmwMMwmMMMK.',
      '.KMmmmwMMwmMMMK.',
      '.KEEmMMMMMMmEEK.',
      '..KEKMMMMMMKEK..',
      '...KKEKKKKEK....',
      '....KEK..KEK....',
      '....KK....KK....',
      '................'
    ];

    // 4. Demon Lord Boss
    const P_DUNGEON_BOSS = {
      '.': null, 'K': 0x0F172A, 'd': 0x450A0A, 'b': 0x18181B, 'B': 0x18181B,
      'm': 0x52525B, 'M': 0x52525B, 'R': 0x991B1B, 'D': 0xDC2626, 'F': 0xF97316,
      'Y': 0xFDE047, 'E': 0xFEF08A, 'W': 0xFFFFFF
    };
    const boss = [
      'KBK..........KBK',
      'KMBK........KMBK',
      '.KMBKKKKKKKKMBK.',
      '..KMBBDDDDDDBMK.',
      '..KDDDFFFDDDDK..',
      '.KDDDKEKDDKEKDK.',
      '.KDDDKKKKKKKKDK.',
      '.KDDFDDWWDDFFDK.',
      '..KDDFYYFDDDK...',
      '...KDDDDDDDDK...',
      '..KKbBDDDDDbBKK.',
      '.KbMbKYYYYKbMbK.',
      '.KbMbKYFFYKbMbK.',
      '..KMbKKKKKKMbK..',
      '...KK......KK...',
      '................'
    ];

    // 5. Loot Chest
    const P_CHEST = {
      '.': null, 'K': 0x0F172A, 'd': 0x291E0B, 's': 0x451A03,
      'S': 0x78350F, 'y': 0xB45309, 'f': 0xB8860B, 'F': 0xEAB308,
      'Y': 0xFEF08A, 'N': 0x0F172A
    };
    const chest = [
      '....KKKKKKKK....',
      '..KKFYYYYYYFKK..',
      '.KFFsSSSSSSsFFK.',
      '.KFFsSSSSSSsFFK.',
      '.KFFFffffffFFFK.',
      '.KFFsSSNNSSsFFK.',
      '.KFFsSSNNSSsFFK.',
      '.KFFFffffffFFFK.',
      '.KFFsSSSSSSsFFK.',
      '.KFFsSSSSSSsFFK.',
      '..KKFYYYYYYFKK..',
      '....KKKKKKKK....',
      '................',
      '................',
      '................',
      '................'
    ];

    // 6. Loot Coin
    const P_COIN = {
      '.': null, 'K': 0x0F172A, 'd': 0x78350F, 'f': 0xCA8A04,
      'F': 0xEAB308, 'Y': 0xFDE047, 'E': 0xFEF08A, 'W': 0xFFFFFF
    };
    const coin = [
      '......KKKK......',
      '....KKYYYYKK....',
      '...KEEWWYYYYK...',
      '..KYYFFfFFYYYK..',
      '.KYYFFFfFFFYYYK.',
      '.KYYFFFfFFFYYYK.',
      '..KYYFFfFFYYYK..',
      '...KYYffffffK...',
      '....KKffffKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 7. Loot Gem
    const P_GEM = {
      '.': null, 'K': 0x0F172A, 'd': 0x083344, 'c': 0x0E7490,
      'C': 0x06B6D4, 'A': 0x38BDF8, 'W': 0xE0F2FE, 'S': 0xFFFFFF
    };
    const gem = [
      '......KKKK......',
      '....KKWWAAKK....',
      '...KSSAAAAAAK...',
      '..KWWCCCCcCCAK..',
      '.KWWCCCCCCccCAK.',
      '.KWWCCCCCCccCAK.',
      '..KWWCCCCcCCAK..',
      '...KWWccccAAK...',
      '....KKccccKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 8. Loot Potion
    const P_POTION = {
      '.': null, 'K': 0x0F172A, 'd': 0x450A0A, 'p': 0x78350F,
      'y': 0xD97706, 'r': 0x991B1B, 'P': 0xEF4444, 'a': 0xF87171,
      'A': 0xFCA5A5, 'Y': 0xFEF08A, 'W': 0xFFFFFF
    };
    const potion = [
      '......KKKK......',
      '......KppK......',
      '.....KKyyKK.....',
      '....KKaaWaaKK...',
      '...KaaWWaPaaAK..',
      '..KaaWPPYPPPAAK.',
      '..KaaWPPPPPAAK..',
      '...KaaPrrPAAK...',
      '....KKrrrrKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    // 9. Loot Scroll
    const P_SCROLL = {
      '.': null, 'K': 0x0F172A, 'd': 0x451A03, 's': 0xD97706,
      'Y': 0xFDE047, 'W': 0xFFFEF0, 'w': 0xFEF08A, 'r': 0x991B1B,
      'R': 0xEF4444, 'F': 0xF59E0B
    };
    const scroll = [
      '......KKKK......',
      '....KKWWYYKK....',
      '...KWWWWYYYYK...',
      '..KWWWWRRYYYYK..',
      '.KWWWWWRRYYYYYK.',
      '.KWWWWFRRRYYYYK.',
      '..KWWWWRRYYYYK..',
      '...KWWWWYYYYK...',
      '....KKssssKK....',
      '......KKKK......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ];

    this.createTexture(scene, 'dungeon_green_slime', slime, P_SLIME);
    this.createTexture(scene, 'dungeon_goblin_warrior', goblin, P_GOBLIN);
    this.createTexture(scene, 'dungeon_skeleton_archer', skeleton, P_SKELETON);
    this.createTexture(scene, 'dungeon_boss', boss, P_DUNGEON_BOSS);

    this.createTexture(scene, 'loot_coin', coin, P_COIN);
    this.createTexture(scene, 'loot_gem', gem, P_GEM);
    this.createTexture(scene, 'loot_potion', potion, P_POTION);
    this.createTexture(scene, 'loot_chest', chest, P_CHEST);
    this.createTexture(scene, 'loot_scroll', scroll, P_SCROLL);
  }

  static _genBossTextures(scene) {
    if (!scene || !scene.textures || scene.textures.exists('boss_fire_golem')) return;

    // 1. Fire Golem Boss
    const P_FIRE_GOLEM = {
      '.': null, 'K': 0x0F172A, 'r': 0x450A0A, 'R': 0x78350F,
      'f': 0xB91C1C, 'F': 0xEF4444, 'o': 0xF97316, 'Y': 0xFDE047, 'W': 0xFFFFFF
    };
    const fire_golem = [
      '.....KooooK.....',
      '....KoffffoK....',
      '..KKrrrrrrrrKK..',
      '.KrrRFFFFFFRrrK.',
      '.KrRFWYYYYWFREK.',
      '.KrRFYWWWWYFRrK.',
      '.KrrRFFFFFFRrEK.',
      '..KKrrrrrrrrKK..',
      '.KffRooooooooRffK',
      'KffRYYYYYYYYYRffK',
      'KffRYWYYYYWWYRFfK',
      '.KffRooooooooRffK',
      '..KKrrrrrrrrKK..',
      '..KrRrK..KrRrK..',
      '..KrRrK..KrRrK..',
      '..KKKKK..KKKKK..'
    ];

    // 2. Shadow Dragon Boss
    const P_SHADOW_DRAGON = {
      '.': null, 'K': 0x0F172A, 'd': 0x1E1B4B, 'v': 0x312E81,
      'p': 0x5B21B6, 'V': 0x7C3AED, 'E': 0xC084FC, 'W': 0xFFFFFF, 'w': 0x4C1D95
    };
    const shadow_dragon = [
      'K...KK....KK...K',
      'KwKKvdKKKKdvKKwK',
      'KwwwvdvvvvdvwwwK',
      '.KwwwvPPPPvwwwK.',
      '..KwKPPEEPPKwK..',
      '..KwPEWWWWEPwK..',
      '..KwPEWWWWEPwK..',
      '..KwKPPEEPPKwK..',
      '...KvvVVVVvvK...',
      '..KvvVVVVVVvvK..',
      '.KvvVVpVVpVVvvK.',
      '.KvvVVVVVVVVvvK.',
      '..KvvVVVVVVvvK..',
      '..KddK....KddK..',
      '..KddK....KddK..',
      '..KKKK....KKKK..'
    ];

    // 3. Ice Lich Boss
    const P_ICE_LICH = {
      '.': null, 'K': 0x0F172A, 'i': 0x0284C7, 'I': 0x0369A1,
      'c': 0x38BDF8, 'C': 0x7DD3FC, 'W': 0xE0F2FE, 'S': 0xFFFFFF, 'm': 0x1E293B
    };
    const ice_lich = [
      '.....KCSSCK.....',
      '....KCCCCCCK....',
      '...KcCCCCCCcK...',
      '..KicKWWWWKciK..',
      '..KiKWSWWSWKCiK.',
      '..KiKWSWWSWKCiK.',
      '..KicKWWWWKciK..',
      '...KcCCCCCCcK...',
      '..KmmCCCCCCmmK..',
      '.KmmmCWWWW CmmmK',
      '.KmmmCWSWSCmmmK.',
      '.KmmmCWWWW CmmmK',
      '..KmmCCCCCCmmK..',
      '...KmmmmmmmmK...',
      '....KmmmmmmK....',
      '.....KKKKKK.....'
    ];

    // 4. Cyber Kraken Boss
    const P_CYBER_KRAKEN = {
      '.': null, 'K': 0x0F172A, 'k': 0x111827, 'd': 0x1F2937,
      'n': 0x06B6D4, 'N': 0x22D3EE, 'p': 0xD946EF, 'P': 0xF0ABFC, 'W': 0xFFFFFF
    };
    const cyber_kraken = [
      '....KKNNNNKK....',
      '..KKNNWWWWNNKK..',
      '.KNNddNNNNddNNK.',
      'KNNdNNWWWWNNdNNK',
      'KNNdNPWWWWPNdNNK',
      'KNNdNPWWWWPNdNNK',
      'KNNdNNWWWWNNdNNK',
      '.KNNddNNNNddNNK.',
      '..KKNNPPPPNNKK..',
      '.KpPKNNNNNNKpPK.',
      'KpP...KNNK...PpK',
      'KpP...KNNK...PpK',
      'KpP...KNNK...PpK',
      '.KpPK.KNNK.KPpK.',
      '..KKK.KKKK.KKK..',
      '................'
    ];

    this.createTexture(scene, 'boss_fire_golem', fire_golem, P_FIRE_GOLEM);
    this.createTexture(scene, 'boss_shadow_dragon', shadow_dragon, P_SHADOW_DRAGON);
    this.createTexture(scene, 'boss_ice_lich', ice_lich, P_ICE_LICH);
    this.createTexture(scene, 'boss_cyber_kraken', cyber_kraken, P_CYBER_KRAKEN);
  }
}

const K = {
  '.':null,
  'G':0x5DA832,'g':0x4A9225,'H':0x77CC44,'d':0x3A7015,
  'A':0x9A6538,'a':0x7A480A,'B':0xC48E58,
  'W':0x5C3010,'w':0x3E1C08,'J':0xFFFFFF,
  'O':0xB87838,'o':0xD8A860,'U':0x885018,
  'L':0x4AC83A,'l':0x32A820,'M':0x227A12,'m':0x1A5C08,
  'K':0x886030,'k':0x604018,'s':0xA88048,
  'X':0xF9D09B,'x':0xD8A070,'N':0x2A1A0A,'I':0xFFB3B3,
  'T':0xB87838,'t':0xD8A060,'V':0x7A4E18,
  'Z':0x5B8DD9,'z':0x3A6BA8,
  'Q':0x3D5A80,'q':0x2D4A70,
  'R':0x6B3A18,'r':0x4A2810,'S':0x8B5A38,
  'P':0x3AA828,'p':0x228018,'v':0x5EC83A,
  'C':0xAEAA9E,'c':0x8C8880,'b':0xC8C4BA,
};
function drawS(g, rows, ox=0, oy=0) {
  rows.forEach((row, ry) => {
    for(let rx=0; rx<row.length; rx++) {
      const col=K[row[rx]]; if(col==null) continue;
      g.fillStyle(col,1); g.fillRect((ox+rx)*PS,(oy+ry)*PS,PS,PS);
    }
  });
}
function pR(g,x,y,w,h,col,a=1){g.fillStyle(col,a);g.fillRect(x*PS,y*PS,w*PS,h*PS);}

// ═══════════════ SPRITE DATA ══════════════════════════════════════════════════
const GRASS=[
 // Patchy meadow. Large same-color clumps so the tile does not read as a checkerboard.
 ['GGGGHGGGGGGGHGGG','GGGHGGGGHGGGGGGG','GGGGGGGGGGGHGGGG','HGGGGGGGGGGGGGHG',
  'GGGGGHGGGGGGGGGG','GGHGGGGGGGHGGGGG','GGGGGGGHGGGGGGGG','GGGGGGGGGGGGHGGG',
  'GHGGGGGGGGGGGGGG','GGGGGGHGGGGGGGGG','GGGHGGGGGGGGHGGG','GGGGGGGGGHGGGGGG',
  'GGGGHGGGGGGGGGGG','HGGGGGGGGGGGHGGG','GGGGGGGHGGGGGGGG','GGHGGGGGGGGGGGHG'],
 ['GGGGHGGGGGGGHGGG','GGGHGGJOGGGGGGGG','GGGGGGJOJGGGHGGG','HGGGGGpGGGGGGGHG',
  'GGGGGHGGGGGGGGGG','GGHGGGGGGGHGGGGG','GGGGGGGHGGGGGGGG','GGGGGGGGGGGGHGGG',
  'GHGGGGGGGGGGGGGG','GGGGGGHGGIGGGGGG','GGGHGGGGGIOIHGGG','GGGGGGGGGpGGGGGG',
  'GGGGHGGGGGGGGGGG','HGGGGGGGGGGGHGGG','GGGGGGGHGGGGGGGG','GGHGGGGGGGGGGGHG'],
 ['GGGGHGGGGGGGHGGG','GGGHGGGGHGGGGGGG','GGGGGGGGGGGHGGGG','HGGGGGGGGGGGGGHG',
  'GGGGGHGGGGGGGGGG','GGHGGGGGGGHGGGGG','GGGGGGGHGGbbGGGG','GGGGGGGGGCbCGHGG',
  'GHGGGGGGGcCcGGGG','GGGGGGHGGGbbGGGG','GGGHGGGGGGGGHGGG','GGGGGGGGGHGGGGGG',
  'GGGGHGGGGGGGGGGG','HGGGGGGGGGGGHGGG','GGGGGGGHGGGGGGGG','GGHGGGGGGGGGGGHG'],
 ['GGGGHGGPvpGGHGGG','GGGHGGpvpGGGGGGG','GGGGGGpGGGGGHGGG','HGGGGGGGGGGGGGHG',
  'GGGGGHGGGGGGGGGG','GGHGGGGGGGHGGGGG','GGGGGGGHGGGGGGGG','GGGGGGGGGGGGHGGG',
  'GHGGGGPdGGGGGGGG','GGGGGGpGpGGGGGGG','GGGHGGpGpGGGHGGG','GGGGGGGpdGGGGGGG',
  'GGGGHGGGGGGGGGGG','HGGGGGGGGGGGHGGG','GGGGGGGHGGGGGGGG','GGHGGGGGGGGGGGHG'],
];
const DIRT_DRY=[
  'AAAAaAAAAAaAAAAA',
  'AAaAAAAAAaAAAAAA',
  'aaaaaaaaaaaaaaaa',
  'AAAAaAAAAAaAAAAA',
  'AAaBAAAAAaAAAAAA',
  'aaaaaaaaaaaaaaaa',
  'AAAAaAAAAAaAAAAA',
  'AAAAAAaAAAAAaAAA',
  'aaaaaaaaaaaaaaaa',
  'AAAAaAAAAAaAAAAA',
  'AAaAAAAAAaBAAAAA',
  'aaaaaaaaaaaaaaaa',
  'AAAAaAAAAAaAAAAA',
  'AAAAAAaAAAAAaAAA',
  'aaaaaaaaaaaaaaaa',
  'aAAaAAaAAaAAaAAa'
];
const DIRT_WET=[
  'WWWWwWWWWWwWWWWW',
  'WWwWWWWJWwWWWWWW',
  'wwwwwwwwwwwwwwww',
  'WWWWwWWWWWwWWWWW',
  'WWwWWWWWWwWWWWWW',
  'wwwwwwwwwwwwwwww',
  'WWWWwWWWWWwWWWWW',
  'WWWWWWwJWWWWwWWW',
  'wwwwwwwwwwwwwwww',
  'WWWWwWWWWWwWWWWW',
  'WWwWWWWWWwWWWWWW',
  'wwwwwwwwwwwwwwww',
  'WWWWwWWWWWwWWWWW',
  'WWWWWWwWWWWWwWWW',
  'wwwwwwwwwwwwwwww',
  'wWWwWWwWWwWWwWWw'
];

