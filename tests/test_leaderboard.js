/**
 * tests/test_leaderboard.js — the board is real now, and the things that have to hold for that
 * to be safe are here.
 *
 * What it replaced: four hard-coded rivals in js/overlays.js with the player appended as a
 * fifth row called "Player (Hero Player)". Signing in changed nothing about that row, and the
 * default tab ranks on SRS-mature words, which is zero for the first three weeks of any account
 * however much has been played. A signed-in player with 4200 honour and Lv.42 therefore sat
 * last, behind four people who do not exist, which is exactly what was reported.
 *
 * Three things matter more than the ranking itself:
 *
 *   - No email and no Google `sub` may reach a row. A leaderboard is shown to other people.
 *   - Numbers come from the client, so they are clamped. This does not stop a determined cheat
 *     and is not claimed to; it stops a bug or a tinkered save writing Infinity and making the
 *     board unreadable for everyone.
 *   - Names are arbitrary text from third-party profiles and the client renders rows through
 *     innerHTML. They are escaped on the way out and stripped on the way in.
 *
 * Run: node tests/test_leaderboard.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log('  [PASS] ' + msg); passed++; }
  else { console.error('  [FAIL] ' + msg); failed++; }
}
function eq(a, b, msg) {
  assert(a === b, msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')');
}

// api/_leaderboard.js imports nothing, which is the point: api/leaderboard.js needs the AWS SDK
// and the CI test job has no npm install.
const L = require(path.join('..', 'api', '_leaderboard.js'));
const overlays = read('js/overlays.js');
const saveApi = read('api/save.js');
const lbApi = read('api/leaderboard.js');
const html = read('index.html');

console.log('====================================================');
console.log('LEADERBOARD');
console.log('====================================================');

// ── 1. The fake rivals are gone ──────────────────────────────────────────────
console.log('\n--- 1. No invented players ---');
// Checked against code, not prose. The comments above the leaderboard name the four rivals in
// order to say they were removed, and a plain substring search over the whole file reads that
// explanation as the thing it is explaining.
const codeOnly = overlays
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
['LOCAL_RIVALS', 'Min-jun', 'Seo-yeon', 'Ji-hoon', 'Ha-eun', 'Hero Player'].forEach((s) => {
  assert(!codeOnly.includes(s), s + ' is no longer in the client code');
});
assert(/fetch\('\/api\/leaderboard/.test(overlays), 'the board is fetched from /api/leaderboard');
assert(!/Local scores on this device/.test(html), 'and the header no longer calls the board local');

// ── 2. Nothing personal reaches a row ────────────────────────────────────────
console.log('\n--- 2. What a row may carry ---');
const user = { sub: '104729384710298347', name: 'Davey', email: 'soulsshare@soulslab.co', picture: 'https://x/y.png' };
const save = {
  leaderboards: { personalBests: {
    totalWordsMastered: 37, totalHonor: 4200, arcadeHighScore: 1850,
    dungeonMaxFloor: 11, highestCookingTier: 'Sous Chef 🍲'
  } },
  playerRank: { level: 42 }
};
const entry = L.entryFromSave(save, user, 1700000000000);
const stored = JSON.stringify(entry);
assert(!stored.includes('soulsshare'), 'the email is not stored');
assert(!stored.includes('@'), 'nor anything shaped like one');
assert(!stored.includes(user.sub), 'the Google sub is not stored');
assert(!stored.includes('googleusercontent') && !stored.includes('picture'), 'nor the profile picture');
const pub = JSON.stringify(L.publicRow(entry));
assert(!pub.includes(user.sub) && !pub.includes('soulsshare'), 'and neither reaches the public row');
eq(L.displayName({ email: 'a@b.com' }), 'Valley resident',
  'a profile with only an email gets a neutral name, not the address');
eq(L.displayName({ name: 'Davey', email: 'a@b.com' }), 'Davey', 'a profile name is used as given');

// publicRow is built by picking, so a field added to the stored row cannot leak by default.
const surprise = L.publicRow({ ...entry, secret: 'do-not-ship', email: 'x@y.z' });
assert(!('secret' in surprise) && !('email' in surprise),
  'an unexpected field on a stored row does not appear in the public row');

// ── 3. Clamping ──────────────────────────────────────────────────────────────
console.log('\n--- 3. Numbers arrive from the client, so they are clamped ---');
const wild = L.entryFromSave({
  leaderboards: { personalBests: {
    totalWordsMastered: Infinity, totalHonor: 1e30, arcadeHighScore: -5,
    dungeonMaxFloor: 'NaN', highestCookingTier: '<img src=x onerror=alert(1)>'
  } },
  playerRank: { level: 9999 }
}, { sub: 'x', name: 'x' }, 1);
eq(wild.words, 0, 'Infinity is not a score');
eq(wild.honor, L.LIMITS.honor, '1e30 is capped rather than sorted against');
eq(wild.arcade, 0, 'a negative score is zero');
eq(wild.dungeon, 0, 'a non-numeric floor is zero');
eq(wild.rankLv, L.LIMITS.rankLv, 'a rank above RANK_MAX is capped at ' + L.LIMITS.rankLv);
eq(wild.cooking, 'novice', 'a cooking tier outside the closed set falls back rather than being stored');
assert(L.COOKING_TIERS.every((t) => L.cookingTier(t.id).label === t.label),
  'every tier id resolves to its own label');
eq(L.entryFromSave({}, { sub: 'x' }, 1).rankLv, 1, 'a save with no rank still yields a usable row');
eq(L.entryFromSave(null, null, 1).words, 0, 'and a missing save does not throw');

// ── 4. Names are hostile input ───────────────────────────────────────────────
console.log('\n--- 4. Names ---');
eq(L.cleanName('<img src=x onerror=alert(1)>'), 'img src=x onerror=alert(',
  'markup characters are stripped (and the rest truncated at ' + L.NAME_MAX + ')');
assert(!/[<>&"'`\\]/.test(L.cleanName('<b>&"\'`\\</b>')), 'no markup character survives');
eq(L.cleanName('Kim\tMinjun'), 'Kim Minjun',
  'a tab becomes a space — deleting it would turn one name into a different name');
eq(L.cleanName('​​Davey​'), 'Davey',
  'zero-width characters are deleted, so a name cannot imitate another name');
eq(L.cleanName('   '), '', 'a name of only whitespace is empty, not a row of spaces');
assert(L.cleanName('a'.repeat(200)).length === L.NAME_MAX, 'and length is bounded');
// The client is the half that has to hold. Every cell in the rendered row is escaped.
const rowFn = (overlays.match(/const row = \(r\) => \{[\s\S]*?\n  \};/) || [''])[0];
assert(rowFn.length > 0, 'the row renderer is found');
['vbEsc(r.name)', 'vbEsc(badge)', 'vbEsc(col.val(r))'].forEach((s) => {
  assert(rowFn.includes(s), 'the rendered row escapes: ' + s);
});
// Scoped to the row renderer. `${r.name}` also appears in the recipe cards further up the
// file, where `r` is a recipe out of the game's own content — checking the whole file reads
// that as a leaderboard escape being missed.
assert(!/\$\{r\.name\}/.test(rowFn), 'and no name is interpolated raw in the row');
assert(!/\$\{[^}]*\.name[^}]*\}/.test(rowFn.replace(/vbEsc\([^)]*\)/g, 'ESC')),
  'every interpolation in the row goes through vbEsc');

// ── 5. Ranking ───────────────────────────────────────────────────────────────
console.log('\n--- 5. Ranking ---');
const mk = (id, o) => ({ id, name: id, words: 0, honor: 0, arcade: 0, dungeon: 0, rankLv: 1, cooking: 'novice', updatedAt: 0, ...o });
const board = [
  mk('a', { words: 5, honor: 100, rankLv: 3, cooking: 'sous' }),
  mk('b', { words: 12, honor: 50, rankLv: 9, cooking: 'novice' }),
  mk('c', { words: 12, honor: 900, rankLv: 1, cooking: 'grand', updatedAt: 5 })
];
eq(L.rankBoard(board, 'vocab').map((r) => r.id).join(''), 'bca', 'vocab sorts on words, ties to the older row');
eq(L.rankBoard(board, 'honor').map((r) => r.id).join(''), 'cab', 'honor sorts on honor');
eq(L.rankBoard(board, 'rank').map((r) => r.id).join(''), 'bac', 'rank sorts on valley level');
eq(L.rankBoard(board, 'cooking')[0].id, 'c', 'cooking sorts on the tier score, not the label text');
eq(L.rankBoard(board, 'nonsense').map((r) => r.id).join(''), 'bca', 'an unknown tab falls back to vocab rather than shuffling');
eq(L.rankBoard(board, 'vocab', 2).length, 2, 'a limit truncates');
eq(L.rankBoard([], 'vocab').length, 0, 'an empty board is empty, not an error');
eq(L.rankBoard([null, undefined, board[0]], 'vocab').length, 1, 'and unreadable rows are dropped');
// publicId has to be stable, or a player stops recognising their own row between sessions.
eq(L.publicId('abc'), L.publicId('abc'), 'the public id is stable for one account');
assert(L.publicId('abc') !== L.publicId('abd'), 'and differs between accounts');
assert(!L.publicId('abc').includes('abc'), 'and does not contain the sub it came from');

// ── 6. The write path is the save, not a submit endpoint ─────────────────────
console.log('\n--- 6. Where rows come from ---');
assert(/entryFromSave\(payload, user, writeNow\)/.test(saveApi),
  'the save PUT writes the row from the payload it just stored');
assert(/catch \(e\) \{\s*\n\s*console\.warn\('\[save\] leaderboard row not written/.test(saveApi),
  'and a failed row never fails the save — progress matters more than a ranking');
assert(saveApi.indexOf('entryFromSave') > saveApi.indexOf('PutObjectCommand'),
  'the row is written after the save, not before it');
assert(!/req\.method === 'POST'/.test(lbApi) && !/req\.method === 'PUT'/.test(lbApi),
  'the leaderboard route is read-only — there is no way to post a score directly');
assert(/method not allowed/.test(lbApi), 'and it says so for other methods');
assert(/verifyGoogleIdToken/.test(lbApi), 'a token is read when present');
assert(/catch \{ me = null; \}/.test(lbApi),
  'but a bad token costs you the `you` block, not the whole board');
assert(/private, no-store/.test(lbApi) && /Vary/.test(lbApi),
  'an authenticated response is not shared by a cache');
assert(/trust: 'client-reported'/.test(lbApi),
  'and the response says plainly where the numbers came from');

console.log('\n====================================================');
console.log(passed + ' passed, ' + failed + ' failed');
console.log('====================================================');
process.exit(failed ? 1 : 0);
