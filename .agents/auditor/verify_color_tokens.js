const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', '..', 'game.js');
const code = fs.readFileSync(gameJsPath, 'utf8');

// Extract W_PAL from class PixelArtRenderer
const wPalMatch = code.match(/static W_PAL = ({[\s\S]*?});\s*static WIZ_0/m);
let WIZ_PAL = {};
if (wPalMatch) {
  try {
    WIZ_PAL = eval('(' + wPalMatch[1] + ')');
  } catch (e) {
    console.error('Error parsing W_PAL:', e);
  }
}

const SHOP_PAL = {
  'B': 0x1E293B, 'A': 0x38BDF8, 'X': 0xFFDDAD, 'x': 0xF4A261, 'f': 0xFFF0D5,
  'Q': 0xE76F51, 'U': 0xF8FAFC, 'u': 0xCBD5E1, 'J': 0x1E3A8A, 'j': 0x172554,
  'm': 0xF59E0B, 'K': 0x0F172A, 'O': 0xE5A96E, 'o': 0xC8864B, 'W': 0x965A2C,
  'w': 0x643714, 'Y': 0xFEF08A, 'y': 0xF59E0B
};

const NOTICE_PAL = {
  'K': 0x0F172A, 'O': 0xE5A96E, 'o': 0xC8864B, 'W': 0x965A2C, 'w': 0x643714,
  'd': 0x3E2009, 'b': 0xFFF3C7, 'B': 0xFFFAF0, 'u': 0xE2E8F0, 'N': 0x334155,
  'n': 0x64748B, 'R': 0xEF4444, 'r': 0x991B1B, 'M': 0x475569, 'm': 0x1E293B,
  'Y': 0xFEF08A, 'y': 0xF59E0B, 'g': 0xFB7185
};

const PORTAL_PAL = {
  'K': 0x0F172A, 't': 0xE2E8F0, 'T': 0x94A3B8, 'S': 0x475569, 's': 0x1E293B,
  'C': 0x38BDF8, 'Q': 0xF43F5E, 'Y': 0xFACC15, 'P': 0xD8B4FE, 'p': 0x9333EA,
  'm': 0x581C87, 'V': 0x2563EB, 'v': 0x0284C7, 'E': 0xA5F3FC, 'W': 0xFFFFFF,
  'z': 0xF472B6, 'X': 0xE0E7FF
};

const BEEHIVE_PAL = {
  'K': 0x0F172A, 'k': 0x1E293B, 'b': 0x451A03, 'B': 0x78350F, 'W': 0x92400E,
  'w': 0xB45309, 'O': 0xD97706, 'S': 0x642404, 'D': 0x853208, 'A': 0xA7490A,
  'M': 0xC46808, 'Y': 0xFACC15, 'y': 0xFDE047, 'H': 0xFEF08A, 'C': 0xFFFBEB,
  'G': 0xF59E0B, 'g': 0xE08208
};

const CAT_PAL = {
  'K': 0x0F172A, 'k': 0x121016, 'H': 0xFBAE68, 'G': 0xEE7B28, 'g': 0xC86228,
  'D': 0x9E3B0E, 'd': 0x782D00, 'W': 0xFFFFFF, 'C': 0xFFF3E0, 'c': 0xF1F5F9,
  'w': 0xCBD5E1, 'P': 0xFFB3C1, 'p': 0xE67E90, 'E': 0x55C655, 'I': 0x22C55E,
  'e': 0x1E4A1E, 'L': 0xA3F0A3, 'Z': 0x93C5FD, 'z': 0xBFDBFE
};

console.log('--- COLOR TOKEN COUNTS ---');
console.log('Shop NPC Palette Tokens:', Object.keys(SHOP_PAL).length);
console.log('Wizard NPC Palette Tokens (W_PAL):', Object.keys(WIZ_PAL).length);
console.log('Cat NPC Palette Tokens (C):', Object.keys(CAT_PAL).length);
console.log('Notice Board Palette Tokens:', Object.keys(NOTICE_PAL).length);
console.log('Dungeon Portal Palette Tokens:', Object.keys(PORTAL_PAL).length);
console.log('Beehive Palette Tokens:', Object.keys(BEEHIVE_PAL).length);

console.log('\n--- 1PX DARK OUTLINE CHECK (0x0F172A / 0x121016) ---');
console.log('Shop outlineDark (K: 0x0F172A):', (SHOP_PAL['K'] === 0x0F172A));
console.log('Wizard outlineDark (K: 0x0F172A):', (WIZ_PAL['K'] === 0x0F172A));
console.log('Cat outlineDark (K: 0x0F172A):', (CAT_PAL['K'] === 0x0F172A));
console.log('Notice Board outlineDark (K: 0x0F172A):', (NOTICE_PAL['K'] === 0x0F172A));
console.log('Dungeon Portal outlineDark (K: 0x0F172A):', (PORTAL_PAL['K'] === 0x0F172A));
console.log('Beehive outlineDark (K: 0x0F172A):', (BEEHIVE_PAL['K'] === 0x0F172A));
