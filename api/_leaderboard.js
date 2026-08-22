// Leaderboard shaping rules, kept dependency-free so tests can reach them: the CI `test` job
// has no npm install, and api/leaderboard.js cannot be required without the AWS SDK.
//
// Storage layout. One tiny object per player, `leaderboard/<sub>.json`, written as a byproduct
// of the save PUT in api/save.js — the endpoint that already has a verified Google identity in
// hand. One key per player means writes never contend, which a single shared board object
// could not promise: two players saving at the same moment would read-modify-write over each
// other and one would vanish. The read endpoint lists the prefix and sorts.
//
// What is NOT stored is the point of half of this file. The email never leaves the save; a
// leaderboard is shown to other people and an email address is not a display name. The Google
// `sub` never appears in a response either — it is a stable account identifier. The client
// finds its own row by an opaque id derived from the sub instead.

const PREFIX = 'leaderboard/';

// Ceilings. These do not stop a determined cheat — the client owns every number here, and no
// amount of server arithmetic changes that. What they stop is the realistic failure: a bug, a
// tinkered save or an overflowed counter writing Infinity or 1e30 and making the board
// unreadable for everyone else. Sorting and display survive; that is the whole claim.
const LIMITS = {
  words: 5000,      // the whole corpus is ~1640 headwords across levels.json and the units
  honor: 1000000,
  arcade: 10000000,
  dungeon: 999,
  rankLv: 60        // RANK_MAX in js/systems/save.js
};

// Cooking tiers are a closed set, so the label is chosen from this table rather than taken
// from the client. An arbitrary string would otherwise reach the leaderboard, and the client
// renders rows into innerHTML.
const COOKING_TIERS = [
  { id: 'novice', label: 'Novice Cook 🍳', score: 10 },
  { id: 'apprentice', label: 'Apprentice Chef 👨‍🍳', score: 50 },
  { id: 'sous', label: 'Sous Chef 🍲', score: 150 },
  { id: 'master', label: 'Master Chef 🌟', score: 300 },
  { id: 'grand', label: 'Grand Hansik Master 👑', score: 500 }
];

const NAME_MAX = 24;

function num(v, max) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), max);
}

// A display name from a Google profile is arbitrary text from a third party, and the client
// puts leaderboard rows through innerHTML. Escaping at render is the actual defence and stays
// there; this strips what has no business being in a name at all, so a stored row cannot carry
// markup even if a future renderer forgets to escape.
// Order matters here. Zero-width characters are deleted, because they are invisible and a name
// pretending to be another name is the point of using them. Control characters become a space,
// because a tab inside a name is a separator: deleting it turned "Kim\tMinjun" into
// "KimMinjun", which is a different name. Only then is whitespace collapsed.
function cleanName(raw) {
  const s = String(raw == null ? '' : raw)
    .normalize('NFC')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')      // invisible: a name imitating another name
    .replace(/[\u0000-\u001f\u007f]/g, ' ')     // tab, newline, DEL — separators, not nothing
    .replace(/\s+/g, ' ')
    .trim();
  return s.slice(0, NAME_MAX).trim();
}

// Never the email, and never a bare sub. A player with no profile name gets a neutral label
// rather than having one invented from their address.
function displayName(user) {
  return cleanName(user && user.name) || 'Valley resident';
}

function cookingTier(id) {
  return COOKING_TIERS.find((t) => t.id === id) || COOKING_TIERS[0];
}

// The sub identifies the account, so it must not travel to other players. This is a visibility
// screen, not a secret: it only has to stop the raw identifier being handed out, and be stable
// enough that a client recognises its own row across sessions.
function publicId(sub) {
  const s = String(sub || '');
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = ((h1 ^ s.charCodeAt(i)) * 0x01000193) >>> 0;
    h2 = ((h2 + s.charCodeAt(i) * (i + 7)) * 0x85ebca6b) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, 12);
}

// The row written on a save. `save` is the payload the client just PUT, so everything read out
// of it is clamped on the way through.
function entryFromSave(save, user, now) {
  const pb = (save && save.leaderboards && save.leaderboards.personalBests) || {};
  const rank = (save && save.playerRank) || {};
  return {
    v: 1,
    id: publicId(user && user.sub),
    name: displayName(user),
    words: num(pb.totalWordsMastered, LIMITS.words),
    honor: num(pb.totalHonor, LIMITS.honor),
    arcade: num(pb.arcadeHighScore, LIMITS.arcade),
    dungeon: num(pb.dungeonMaxFloor, LIMITS.dungeon),
    rankLv: Math.max(1, num(rank.level, LIMITS.rankLv)),
    cooking: cookingTierId(pb.highestCookingTier),
    updatedAt: now
  };
}

// The client stores the tier as its label. Map it back onto the closed set rather than
// trusting the string, so nothing but a known id is ever persisted.
function cookingTierId(label) {
  const s = String(label == null ? '' : label);
  if (s.includes('Grand')) return 'grand';
  if (s.includes('Master Chef')) return 'master';
  if (s.includes('Sous')) return 'sous';
  if (s.includes('Apprentice')) return 'apprentice';
  return 'novice';
}

const SORTS = {
  vocab: (a, b) => b.words - a.words,
  honor: (a, b) => b.honor - a.honor,
  cooking: (a, b) => cookingTier(b.cooking).score - cookingTier(a.cooking).score,
  arcade: (a, b) => b.arcade - a.arcade,
  dungeon: (a, b) => b.dungeon - a.dungeon,
  rank: (a, b) => b.rankLv - a.rankLv
};

// Ties break on the older entry first, so a board does not reshuffle under a player who has
// not played. Sorting is stable in Node, but the input order here is whatever the bucket
// listing returned, which is not something to lean on.
function rankBoard(entries, tab, limit) {
  const key = SORTS[tab] ? tab : 'vocab';
  const rows = (entries || []).filter(Boolean).slice();
  rows.sort((a, b) => SORTS[key](a, b) || (a.updatedAt || 0) - (b.updatedAt || 0));
  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

// What a reader is allowed to see. Built by picking rather than by deleting, so a field added
// to the stored row does not leak by being forgotten here.
function publicRow(entry) {
  const t = cookingTier(entry.cooking);
  return {
    id: entry.id,
    name: entry.name,
    words: entry.words,
    honor: entry.honor,
    arcade: entry.arcade,
    dungeon: entry.dungeon,
    rankLv: entry.rankLv,
    cookingTier: t.label,
    cookingScore: t.score
  };
}

module.exports = {
  PREFIX, LIMITS, COOKING_TIERS, NAME_MAX,
  cleanName, displayName, cookingTier, cookingTierId, publicId,
  entryFromSave, rankBoard, publicRow
};
