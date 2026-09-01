'use strict';

// Exercise real files and the same first-match lookup as Vocabulary Book.
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { applyTopikArt, prepareTopikArt } = require('../scripts/apply_topik_art');
const { auditVocabArt } = require('../scripts/audit_vocab_art');
const ROOT = path.resolve(__dirname, '..');
const OUTPUTS = ['js/vocabArtMore.js', 'js/systems/economy.js', 'sprites/catalog.json'];

function fixture(run) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'topik-art-test-'));
  const write = (file, data) => {
    fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
    fs.writeFileSync(path.join(temp, file), typeof data === 'string' ? data : JSON.stringify(data));
  };
  const manifest = {
    world: 'topik-2', retained: [{ index: 0, ko: '사과', file: 'sprites/items/farm_apple.png', reviewed: true }],
    entries: [{ index: 1, ko: '배', slug: 'test_pear', folder: 'items',
      sourceImage: 'generated.png', rawReviewed: true, reviewed: true, status: 'reviewed' }]
  };
  write('docs/topik-art-manifest.json', manifest);
  write('worlds/topik-2.json', { level: { words: [{ ko: '사과', en: 'apple' }, { ko: '배', en: 'pear' }] } });
  write('sprites/catalog.json', { cacheKey: 'before', assets: [
    { path: 'items/farm_apple.png', status: 'shipped' }, { path: 'items/test_pear.png', status: 'unused' }
  ] });
  write('js/vocabArt.js', "const VOCAB_ART_ROWS = [{ko:'사과',slug:'farm_apple',folder:'items'}, {ko:'배',slug:'farm_apple',folder:'items'}];\n");
  write('js/vocabArtUnit14.js', '// No extra fixture words.\n');
  write('js/vocabArtMore.js', '// Existing user-authored content stays here.\n');
  write('js/systems/economy.js', "const ART_CACHE_KEY = 'before';\n");
  fs.mkdirSync(path.join(temp, 'sprites/items'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'sprites/items/farm_apple.png'), path.join(temp, 'sprites/items/farm_apple.png'));
  fs.copyFileSync(path.join(ROOT, 'sprites/items/topik_deserted_market.png'), path.join(temp, 'sprites/items/test_pear.png'));
  try { run({ temp, write, manifest }); }
  finally {
    // Fail closed before recursive cleanup: this must still be our exact
    // freshly created child of the OS temporary directory.
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('topik-art-test-'));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

fixture(({ temp }) => {
  const first = applyTopikArt(temp, { requireComplete: true });
  assert.equal(first.reviewed, 1);
  assert.equal(first.remaining, 0);
  assert.equal(auditVocabArt(temp, { world: 'topik-2' }).structurallyUnique, true);
  assert.ok(fs.readFileSync(path.join(temp, OUTPUTS[0]), 'utf8').startsWith('// Existing user-authored'));
  assert.equal(applyTopikArt(temp, { requireComplete: true, check: true }).cacheKey, first.cacheKey);
  fs.copyFileSync(path.join(ROOT, 'sprites/items/topik_search_for_way.png'), path.join(temp, 'sprites/items/test_pear.png'));
  assert.notEqual(prepareTopikArt(temp).cacheKey, first.cacheKey, 'Replacing PNG bytes invalidates the cache even when the count is unchanged');
  assert.throws(() => applyTopikArt(temp, { check: true }), /out of sync/);
});
console.log('ok  reviewed artwork replaces the actual lookup, preserves existing code and invalidates stale caches');

fixture(({ temp, write }) => {
  const before = prepareTopikArt(temp).cacheKey;
  write('docs/valley-map-art-manifest.json', {
    entries: [{
      role: 'cassette', file: 'sprites/furniture/valley_cassette_player.png',
      sourceImage: 'cassette-source.png', height: 156, mapScale: 0.72, reviewed: true
    }]
  });
  fs.mkdirSync(path.join(temp, 'sprites/furniture'), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, 'sprites/furniture/valley_cassette_player.png'),
    path.join(temp, 'sprites/furniture/valley_cassette_player.png')
  );
  assert.notEqual(prepareTopikArt(temp).cacheKey, before,
    'a reviewed non-TOPIK sprite batch participates in the shared cache key');
});
console.log('ok  shared cache fingerprint includes reviewed Valley map art');

const failures = [
  ['unfinished batch', ({ manifest }) => { manifest.entries[0].reviewed = false; }, /before completion/],
  ['missing original review', ({ manifest }) => { manifest.entries[0].rawReviewed = false; }, /review evidence/],
  ['unreviewed retained image', ({ manifest }) => { manifest.retained[0].reviewed = false; }, /review evidence/],
  ['missing source identifier', ({ manifest }) => { delete manifest.entries[0].sourceImage; }, /review evidence/],
  ['wrong word index', ({ manifest }) => { manifest.entries[0].index = 0; }, /correct world index/],
  ['unsafe sprite path', ({ manifest }) => { manifest.entries[0].slug = '../outside'; }, /Invalid sprite path/],
  ['missing PNG', ({ temp }) => { fs.unlinkSync(path.join(temp, 'sprites/items/test_pear.png')); }, /image is missing/],
  ['copied PNG under another filename', ({ temp }) => {
    fs.copyFileSync(path.join(temp, 'sprites/items/farm_apple.png'), path.join(temp, 'sprites/items/test_pear.png'));
  }, /Copied PNG/],
  ['missing registration', ({ temp, write }) => {
    const pack = JSON.parse(fs.readFileSync(path.join(temp, 'sprites/catalog.json'), 'utf8'));
    pack.assets.pop(); write('sprites/catalog.json', pack);
  }, /Register the image first/],
  ['foreign word borrowing a dedicated image', ({ write }) => {
    write('js/vocabArtMore.js', "VOCAB_ART_ROWS.push({ko:'다른 말',slug:'test_pear',folder:'items'});\n");
  }, /borrowed by/],
  ['missing runtime cache anchor', ({ write }) => { write('js/systems/economy.js', '// Missing anchor\n'); }, /runtime art cache key/]
];
for (const [name, mutate, expected] of failures) {
  fixture(context => {
    mutate(context);
    context.write('docs/topik-art-manifest.json', context.manifest);
    const before = OUTPUTS.map(file => fs.readFileSync(path.join(context.temp, file)));
    assert.throws(() => applyTopikArt(context.temp, { requireComplete: true }), expected);
    OUTPUTS.forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(context.temp, file)), before[index], name + ' must not partially change runtime files'));
  });
  console.log('ok  rejects ' + name + ' before changing runtime files');
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/topik-art-manifest.json'), 'utf8'));
const approved = [...manifest.retained, ...manifest.entries.filter(entry => entry.reviewed)].map(entry => entry.ko);
assert.ok(approved.length > 62, 'The live check must include actual redesigned words');
assert.equal(auditVocabArt(ROOT, { words: approved }).structurallyUnique, true);
applyTopikArt(ROOT, { check: true });
console.log('ok  all ' + approved.length + ' retained/reviewed live TOPIK words are unique and in sync');
