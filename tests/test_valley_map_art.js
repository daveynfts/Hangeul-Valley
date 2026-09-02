'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const manifest = JSON.parse(read('docs/valley-map-art-manifest.json'));
const catalog = JSON.parse(read('sprites/catalog.json'));
const econ = read('js/systems/economy.js');
const farm = read('js/scenes/farm.js');
const layout = JSON.parse(read('worlds/unit10-layout.json'));

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
  console.log('ok  ' + msg);
}

assert(manifest.entries.length === 12, 'manifest covers the twelve redesigned map assets and bee frames');
assert(manifest.entries.every((entry) => entry.reviewed), 'every source and processed sprite was reviewed');
assert(new Set(manifest.entries.map((entry) => entry.role)).size === 12, 'each map role and animation frame has one dedicated asset');

manifest.entries.forEach((entry) => {
  assert(/^[a-z][a-z0-9_]*$/.test(entry.slug), entry.slug + ' follows snake_case');
  assert(fs.existsSync(path.join(ROOT, entry.file)), entry.file + ' exists');
  const rel = entry.file.replace(/^sprites\//, '');
  const row = catalog.assets.find((asset) => asset && asset.path === rel);
  assert(!!row && row.nameEn && row.role === entry.role, rel + ' is named and registered for ' + entry.role);
  const escaped = entry.phaserKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(new RegExp("key: '" + escaped + "'[\\s\\S]{0,100}file: '" + rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'").test(econ),
    entry.phaserKey + ' is loaded from its catalog path');
});

const functionSlice = (start, end) => {
  const startIndex = farm.indexOf(start);
  return farm.slice(startIndex, farm.indexOf(end, startIndex));
};
[
  ['shop', '_createShopNPC(W, H){', '_createBoardNPC(W, H){', 'valley_seed_shop_hd', 'shop_sign'],
  ['board', '_createBoardNPC(W, H){', '_createArcadeNPC(W, H){', 'valley_notice_board_hd', 'notice_board'],
  ['arcade', '_createArcadeNPC(W, H){', '_createWizardNPC(W, H){', 'valley_arcade_cabinet_hd', 'arcade_machine'],
  ['witch', '_createWizardNPC(W, H){', '_createCatNPC(W, H){', 'valley_spell_witch_hd', 'wizard_idle_0'],
  ['cat', '_createCatNPC(W, H){', '_createPortalNPC(W, H){', 'valley_ginger_cat_hd', 'cat_idle_0'],
  ['portal', '_createPortalNPC(W, H){', '_createFishingSpot(W, H){', 'valley_dungeon_portal_hd', 'dungeon_portal']
].forEach(([role, start, end, reviewed, obsolete]) => {
  const block = functionSlice(start, end);
  assert(block.includes("this._reviewedTex('" + reviewed + "')"), role + ' requires reviewed art');
  const obsoleteKey = new RegExp("['\"]" + obsolete.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]");
  assert(!obsoleteKey.test(block) && !block.includes('_propTex('), role + ' cannot restore its old design');
});
const catBehavior = functionSlice('_updateCatNPC(dt) {', '_createPlots(W, H){');
assert(/targetPose = 'sleep'/.test(catBehavior) && !/cat-(idle|walk|sit|sleep)/.test(catBehavior),
  'the redesigned still-image cat has pose feedback without legacy animation frames');

const fishing = farm.slice(farm.indexOf('  _createFishingSpot(W, H){'), farm.indexOf('  _triggerFishJump(fx, fy) {'));
assert(fishing.indexOf("this._reviewedTex('valley_fishing_pond_hd')") >= 0, 'fishing requires the coherent pond landmark');
assert(!/Large stones|pondRadiusX|tile_ocean_deep_0|pond_reed/.test(fishing),
  'the procedural pond design has been removed');
assert(/dockSprite = this\.add\.image/.test(fishing) && /this\._triggerFishJump/.test(fishing),
  'new pond remains clickable and keeps the ambient fish interaction');
assert(/this\._createPondFish\(fx, fy\)/.test(fishing), 'redesigned carp is visibly swimming inside the pond');
assert((fishing.match(/this\.fishX = fx; this\.fishY = fy;/g) || []).length === 1,
  'the reviewed pond has one interaction anchor');
const pondFish = functionSlice('_createPondFish(fx, fy) {', '_createSplashRipples(rx, ry) {');
assert((pondFish.match(/this\._reviewedTex\('valley_pond_carp_hd'\)/g) || []).length === 2,
  'visible and jumping fish both require the reviewed carp');
assert(!/fish_carp|_propTex\(/.test(pondFish), 'the old carp sprite cannot reappear');

assert(/Math\.max\(72, this\.farm\.x - 205\)/.test(farm) && /this\.farm\.y \+ 117/.test(farm),
  'arcade has a separate grounded space between the apple tree and pond');
assert(/Math\.max\(105, this\.farm\.x - 150\)/.test(farm), 'pond stays inside a 576px map');
assert(/Math\.min\(W - 90, this\.farm\.x \+ this\.farm\.w \+ 150\)/.test(farm), 'shop stays inside a 576px map');
assert(/Math\.min\(W - 64, this\.farm\.x \+ this\.farm\.w \+ 135\)/.test(farm), 'portal stays inside a 576px map');
assert(/Math\.max\(92, this\.farm\.x - 115\)/.test(farm), 'apple tree stays inside a 576px map');
assert(/Math\.max\(184, this\.farm\.y - 10\)/.test(farm), 'apple tree stays below the top edge on a 768px map');
assert(/Math\.max\(48, this\.farm\.x - 170\)/.test(farm), 'well stays inside a 576px map');
assert(/Math\.max\(120, this\.farm\.x - 80\)/.test(farm), 'cat remains clear of the well on a 576px map');
assert(/Math\.min\(W - 70, this\.farm\.x \+ this\.farm\.w \+ 78\)/.test(farm)
  && /Math\.max\(180, this\.farm\.y - 6\)/.test(farm),
  'beehive sits outside the plot fence and apple canopy');
assert(/this\.beehiveGround[\s\S]{0,240}fillEllipse/.test(farm), 'beehive has a visible ground contact patch');
assert(!/targets: this\.beehiveSprite,[\s\S]{0,100}repeat: -1/.test(farm), 'beehive body no longer floats or shakes forever');
assert(/const beeFrames = \['valley_honey_bee_open_hd', 'valley_honey_bee_flap_hd'\]/.test(farm)
  && /frames: beeFrames\.map/.test(farm) && /frameRate: 10/.test(farm),
  'apiary bees use the reviewed two-frame wing animation');
const apiary = functionSlice('_createBeehiveNPC(W, H){', '_createFallingLeaves(ax, ay){');
assert(/this\._reviewedTex\('valley_apiary_hive_hd'\)/.test(apiary)
  && /this\.add\.sprite\(bx, by - 42, beeFrames\[i % beeFrames\.length\]\)/.test(apiary),
  'hive and all four apiary bees require reviewed art');
assert(!/p_tiny_bee|_propTex\([^)]*beehive/.test(apiary),
  'old hive and tiny-bee designs cannot reappear');
assert(/setFlipX\(nextX > bee\.sprite\.x\)/.test(farm), 'reviewed bees turn to face their flight direction');

const shop = farm.slice(farm.indexOf('  _createShopNPC(W, H){'), farm.indexOf('  _createBoardNPC(W, H){'));
assert(/this\.shopGround[\s\S]{0,420}fillEllipse/.test(shop), 'shop has a broad visible ground contact patch');
assert(!/targets: this\.shopNPC/.test(shop), 'shop building stays grounded instead of bobbing in the air');
assert(!/old loose barrel|oak_barrel_hd[\s\S]{0,300}wooden_crate_hd/.test(farm.slice(farm.indexOf('// Micro World Details: Stone Well'), farm.indexOf('// Micro World Details: Directional Signpost'))),
  'legacy shop garnish has been deleted rather than conditionally hidden');
assert(/this\._destroyWorldObj\(this\.shopGround\)/.test(farm), 'shop ground is removed with the optional landmark');

const cassette = layout.stations.find((station) => station.id === 'cassette');
assert(cassette && cassette.scale === 0.72, 'cassette uses the reviewed station scale');
const cassetteSpawner = functionSlice('_ensureCassette(){', '_teardownCassette(){');
assert(/hdKey: 'cassette_player_hd'/.test(cassetteSpawner)
  && /const tex = this\._reviewedTex\(hdKey\)/.test(farm),
  'cassette station requires the reviewed cassette sprite');
assert(!/matrixKey:|lastKey:|cassette_player'|pixel_crate/.test(cassetteSpawner)
  && /led: null/.test(cassetteSpawner),
  'old cassette sprites and overlay controls have been removed');
assert(/if \(id === 'valley'\)[\s\S]{0,180}VALLEY_REVIEWED_ART_KEYS/.test(econ)
  && /CASSETTE_REVIEWED_ART/.test(econ)
  && /if \(id === 'topik-2'\)[\s\S]{0,120}study_desk_hd/.test(econ),
  'world changes retry reviewed Valley, study-desk and cassette assets');
assert(/beehiveBaseScale/.test(farm) && /portalBaseScale/.test(farm) && /dockBaseScale/.test(farm),
  'interaction feedback returns each redesigned sprite to its own map scale');
assert(/const baseX = Math\.abs\(this\.catSprite\.scaleX/.test(farm),
  'cat click feedback preserves the current idle, sitting, or sleeping proportions');
assert(/useHdHarvestGesture[\s\S]{0,180}this\._playHarvestGesture/.test(farm)
  && /_createHarvestTrail\(actionType, targetX, targetY\)/.test(farm),
  'HD farmer performs a visible directional harvest gesture with crop motion');
assert(/const toolScale = actionType === 'pick' \? 0\.72 : 0\.78/.test(farm)
  && /playerFeetY\(player\) - player\.displayHeight \* handHeight/.test(farm),
  'basket and sickle stay at the farmer hands instead of covering the face');

console.log('\ntest_valley_map_art: all passed');
