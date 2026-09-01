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

assert(manifest.entries.length === 10, 'manifest covers the ten redesigned map assets');
assert(manifest.entries.every((entry) => entry.reviewed), 'every source and processed sprite was reviewed');
assert(new Set(manifest.entries.map((entry) => entry.role)).size === 10, 'each map role has one dedicated asset');

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

[
  ['shop', 'valley_seed_shop_hd', 'shop_sign'],
  ['board', 'valley_notice_board_hd', 'notice_board'],
  ['arcade', 'valley_arcade_cabinet_hd', 'arcade_machine'],
  ['portal', 'valley_dungeon_portal_hd', 'dungeon_portal'],
  ['beehive', 'valley_apiary_hive_hd', 'beehive']
].forEach(([role, hd, fallback]) => {
  assert(farm.includes("this._propTex('" + hd + "', '" + fallback + "')"),
    role + ' prefers reviewed art and keeps a procedural failure fallback');
});
assert(/valley_spell_witch_hd[\s\S]{0,220}wizard_idle_0/.test(farm), 'legacy wizard path prefers the redesigned witch');
assert(/valley_ginger_cat_hd[\s\S]{0,220}cat_idle_0/.test(farm), 'cat path prefers the redesigned ginger cat');
assert(/if \(this\.catUsesHd\)[\s\S]{0,260}cat-sleep/.test(farm), 'still-image cat states do not request missing animation frames');

const fishing = farm.slice(farm.indexOf('  _createFishingSpot(W, H){'), farm.indexOf('  _triggerFishJump(fx, fy) {'));
assert(fishing.indexOf("textures.exists('valley_fishing_pond_hd')") >= 0, 'fishing uses the coherent pond landmark');
assert(fishing.indexOf("textures.exists('valley_fishing_pond_hd')") < fishing.indexOf('Large stones'),
  'reviewed pond branches before procedural rocks are drawn');
assert(/dockSprite = this\.add\.image/.test(fishing) && /this\._triggerFishJump/.test(fishing),
  'new pond remains clickable and keeps the ambient fish interaction');
assert(/this\._createPondFish\(fx, fy\)/.test(fishing), 'redesigned carp is visibly swimming inside the pond');
assert((fishing.match(/this\.fishX = fx; this\.fishY = fy;/g) || []).length === 2,
  'pond depth anchor stays below the visible swimmer in both render branches');
assert(/this\.dockSprite = this\.pondWater/.test(fishing) && /this\.dockSprite = pond/.test(fishing),
  'procedural pond fallback also remains clickable after a failed image load');
assert(/this\._propTex\('valley_pond_carp_hd', 'fish_carp'\)/.test(farm),
  'visible and jumping fish prefer the reviewed carp with a failure fallback');

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

const cassette = layout.stations.find((station) => station.id === 'cassette');
assert(cassette && cassette.scale === 0.72, 'cassette uses the reviewed station scale');
assert(/hdKey: 'cassette_player_hd'/.test(farm), 'cassette station prefers the reviewed cassette sprite');
assert(/const led = base\.hd \? null/.test(farm), 'reviewed cassette does not get a loose LED over its controls');
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
