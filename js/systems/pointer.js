// ═══════════════ WORLD POINTER (click-to-interact only) ═══════════════════════
// Movement is keyboard / the on-screen stick. The pointer only picks and
// activates objects. FarmScene builds a target catalog; this module decides
// hover and whether a click is in range. Keyboard / the interact button still
// use nearestInRange().

// Functions rather than constants: the hint is drawn into the world on every label, and a
// constant read at load time would be the one string on the farm still in English if the
// catalogue is ever registered after this file — which is exactly what a `const` hides.
function worldClickHint() { return hvT('ui.world.click'); }
function worldTooFarHint() { return hvT('ui.world.tooFar'); }

function pointerDist(ax, ay, bx, by) {
  const dx = (ax || 0) - (bx || 0);
  const dy = (ay || 0) - (by || 0);
  return Math.hypot(dx, dy);
}

function worldPointerBlocked(flags) {
  const f = flags || {};
  return !!(f.playerLocked || f.isPerformingAction || f.quizOpen || f.shopOpen
    || f.memoryOpen || f.trophyOpen || f.catDialogOpen);
}

function pickInteractableAt(targets, wx, wy) {
  if (!targets || !targets.length) return null;
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!t) continue;
    const d = pointerDist(wx, wy, t.x, t.y);
    const r = t.hitR != null ? t.hitR : 32;
    if (d <= r && d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

function inUseRange(player, target) {
  if (!player || !target) return false;
  const r = target.useR != null ? target.useR : 72;
  return pointerDist(player.x, player.y, target.x, target.y) <= r;
}

function pointerWorldPlan(player, targets, wx, wy) {
  const hit = pickInteractableAt(targets, wx, wy);
  if (!hit) return { type: 'none' };
  if (inUseRange(player, hit)) return { type: 'interact', target: hit };
  return { type: 'too-far', target: hit };
}

function pointerHoverLabel(player, target) {
  if (!target) return '';
  if (inUseRange(player, target)) return target.label || worldClickHint();
  return worldTooFarHint();
}

// First in-range target in catalog order. Keyboard / touch interact keep the
// old proximity priority by listing ripe plots before empty ones, etc.
function nearestInRange(player, targets) {
  if (!player || !targets) return null;
  for (let i = 0; i < targets.length; i++) {
    if (inUseRange(player, targets[i])) return targets[i];
  }
  return null;
}

function pointerOrNear(player, hover, id, x, y, r) {
  if (hover && hover.id === id) return true;
  if (!player) return false;
  return pointerDist(player.x, player.y, x, y) < r;
}

function clickActionLabel(verb) {
  return worldClickHint() + (verb ? ' ' + verb : '');
}
