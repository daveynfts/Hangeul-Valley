/**
 * A line of the curriculum's prose as the Workbooks, Units and Levels forms edit it: the
 * Vietnamese in the box, the English under it, read only, with where that English stands.
 * window.HVViField. The Designer's text panel is the same idea with formatting on top.
 *
 *   HVViField.html(obj, field, { ref, label, entries, multiline, rows, compact, korean })
 *   HVViField.bind(host, { resolve(ref), entries(), onChange(obj, field, what) })
 *   HVViField.chip(obj, field, entries)                          where the English stands
 *   HVViField.loadCatalog(rel)                                   locales/vi/<rel>
 *
 * The box writes through HVViFirst.setVi: a draft beside the English when the words differ
 * from what the catalogue files under it, nothing when they read the same. The game shows the
 * new Vietnamese at once and Claude writes the English from it in the next batch
 * (docs/vietnamese-first.md). What a person does to the English itself is ask for a new one,
 * keep the one there is, or mark Claude's as read.
 *
 * Some translatable fields hold Korean instead — most desk-quiz answers are 한 손으로 드리다,
 * not English — and those read the same in every language. They are edited as themselves;
 * with `korean: true` a field can be switched between the two (한 | VI), for a new answer
 * whose language is the author's choice.
 */
(function () {
  'use strict';

  const VF = () => window.HVViFirst;
  function T(s, vars) {
    if (typeof window.T === 'function') return window.T(s, vars);
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // What the English of a field is waiting for: a mark, a name, and the sentence behind it.
  const STATE = {
    todo: ['⏳', 'Waiting for Claude’s English', 'The English will be written from the Vietnamese the next time you ask Claude to translate.'],
    sync: ['↻', 'Waiting to be filed', 'The Vietnamese is saved beside the English; Claude files it in the catalogue on the next batch.'],
    ai: ['🤖', 'AI English — not yet read', 'Claude wrote this English from the Vietnamese. Read it and mark it read, or ask for a new one.'],
    untranslated: ['⚠', 'No Vietnamese yet', 'This English has no Vietnamese. Write the Vietnamese and Claude will check the English against it.'],
    source: ['한', 'Shown as it is', 'Korean (or a name): the game shows it the same in every language, so there is nothing to translate.'],
    ok: ['✓', 'Up to date', 'The English and the Vietnamese agree.']
  };

  function chip(obj, field, entries, iconOnly) {
    const st = VF().status(obj, field, entries || {});
    const i = STATE[st];
    return '<span class="vf-state vf-state-' + st + (iconOnly ? ' vf-state-icon' : '') + '" title="' + esc(T(i[1]) + ' — ' + T(i[2])) + '">'
      + i[0] + (iconOnly ? '' : ' ' + esc(T(i[1]))) + '</span>';
  }

  // Which way a field is being edited. Decided by what it holds, unless the author switched it
  // (a WeakMap, so switching never writes anything into the content).
  const forced = new WeakMap();
  function modeOf(obj, field) {
    const f = forced.get(obj);
    if (f && f[field]) return f[field];
    return VF().isProse(obj, field) ? 'vi' : 'ko';
  }
  function force(obj, field, mode) {
    const f = forced.get(obj) || {};
    f[field] = mode;
    forced.set(obj, f);
  }

  const hasEn = (obj, field) => typeof obj[field] === 'string' && !!obj[field].trim();
  const ACTS = {
    read: ['✓', '✓ Mark the English as read'],
    ask: ['✍', '✍ Ask Claude for a new English'],
    keep: ['↩', 'Keep the English as it is']
  };
  const act = (name, compact) => '<button type="button" class="vf-link" data-vf-act="' + name + '"'
    + (compact ? ' title="' + esc(T(ACTS[name][1])) + '">' + ACTS[name][0] : '>' + esc(T(ACTS[name][1]))) + '</button>';
  function actions(obj, field, entries, compact) {
    const st = VF().status(obj, field, entries || {});
    const vi = VF().viOf(obj, field, entries || {});
    return (st === 'ai' ? act('read', compact) : '')
      + (st !== 'todo' && st !== 'source' && (hasEn(obj, field) || vi) ? act('ask', compact) : '')
      + (st === 'todo' && hasEn(obj, field) ? act('keep', compact) : '');
  }

  function toggle(mode) {
    return mode === 'ko'
      ? '<button type="button" class="vf-mode" data-vf-mode="vi" title="' + esc(T('This text is translated — write it in Vietnamese and Claude writes the English')) + '">VI</button>'
      : '<button type="button" class="vf-mode" data-vf-mode="ko" title="' + esc(T('This answer is Korean — type it as it is shown, in every language')) + '">한</button>';
  }

  function html(obj, field, opt) {
    const o = opt || {};
    const entries = o.entries || {};
    const mode = modeOf(obj, field);
    // What the box was drawn with, kept on it so switching 한 | VI can draw it again.
    const keep = { label: o.label || '', multiline: !!o.multiline, rows: o.rows || 0, compact: !!o.compact, korean: !!o.korean };
    const attrs = ' data-vf="' + esc(o.ref) + '" data-vf-field="' + esc(field) + '" data-vf-state="'
      + VF().status(obj, field, entries) + '" data-vf-now="' + mode + '" data-vf-opt="' + esc(JSON.stringify(keep)) + '"';
    const cls = 'vf' + (o.compact ? ' vf-compact' : '') + (mode === 'ko' ? ' vf-ko' : '');
    const control = (value, hint, data) => (o.multiline
      ? '<textarea class="form-input vf-input" rows="' + (o.rows || 2) + '" ' + data + ' placeholder="' + hint + '">' + esc(value) + '</textarea>'
      : '<input class="form-input vf-input" ' + data + ' value="' + esc(value) + '" placeholder="' + hint + '">');
    const label = (inner) => (o.compact ? inner : '<label>' + esc(o.label) + ' <span class="vf-slot">' + chip(obj, field, entries) + '</span>' + inner + '</label>');
    const sw = o.korean ? toggle(mode) : '';

    if (mode === 'ko') {
      const v = typeof obj[field] === 'string' ? obj[field] : '';
      return '<div class="' + cls + '"' + attrs + '>'
        + label('<span class="vf-row">' + control(v, esc(T('Korean, as it is shown')), 'data-vf-src') + sw + '</span>')
        + '</div>';
    }
    const vi = VF().viOf(obj, field, entries);
    const en = hasEn(obj, field) ? obj[field] : '';
    return '<div class="' + cls + '"' + attrs + '>'
      + label('<span class="vf-row">' + control(vi, esc(T('Write the Vietnamese here…')), 'data-vf-in') + sw + '</span>')
      + '<div class="vf-en">'
      + (o.compact ? '<span class="vf-slot">' + chip(obj, field, entries, true) + '</span>' : '')
      + '<span class="vf-en-tag" title="' + esc(T('English — written by Claude from the Vietnamese')) + '">EN</span>'
      + (en ? '<span class="vf-en-t" translate="no">' + esc(en) + '</span>'
        : '<span class="vf-en-t vf-en-none">' + esc(T('not written yet')) + '</span>')
      + '<span class="vf-actions">' + actions(obj, field, entries, o.compact) + '</span></div>'
      + '</div>';
  }

  function bind(host, opt) {
    if (!host) return;
    host.querySelectorAll('.vf[data-vf]').forEach((box) => bindBox(box, opt || {}));
  }

  function bindBox(box, o) {
    const entries = () => (typeof o.entries === 'function' ? o.entries() : o.entries) || {};
    const ref = box.getAttribute('data-vf');
    const field = box.getAttribute('data-vf-field');
    const compact = box.classList.contains('vf-compact');
    const paint = (obj) => {
      box.setAttribute('data-vf-state', VF().status(obj, field, entries()));
      box.querySelectorAll('.vf-slot').forEach((slot) => { slot.innerHTML = chip(obj, field, entries(), compact); });
      const acts = box.querySelector('.vf-actions');
      if (acts) acts.innerHTML = actions(obj, field, entries(), compact);
    };
    const input = box.querySelector('[data-vf-in]');
    if (input) {
      input.oninput = () => {
        const obj = o.resolve(ref);
        if (!obj) return;
        VF().setVi(obj, field, input.value, entries());
        if (o.onChange) o.onChange(obj, field, 'vi');
        paint(obj);
      };
    }
    const src = box.querySelector('[data-vf-src]');
    if (src) {
      src.oninput = () => {
        const obj = o.resolve(ref);
        if (!obj) return;
        VF().setSource(obj, field, src.value);
        if (o.onChange) o.onChange(obj, field, 'source');
        paint(obj);
      };
    }
    box.onclick = (e) => {
      const t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      const obj = o.resolve(ref);
      if (!obj) return;
      const sw = t.closest('[data-vf-mode]');
      if (sw && box.contains(sw)) {
        // Only the way the box edits changes here; the content changes when something is typed.
        force(obj, field, sw.getAttribute('data-vf-mode'));
        let keep = {};
        try { keep = JSON.parse(box.getAttribute('data-vf-opt') || '{}'); } catch (err) { keep = {}; }
        const fresh = document.createElement('div');
        fresh.innerHTML = html(obj, field, Object.assign({}, keep, { ref, entries: entries() }));
        const next = fresh.firstChild;
        box.replaceWith(next);
        bindBox(next, o);
        const focus = next.querySelector('.vf-input');
        if (focus) focus.focus();
        return;
      }
      const b = t.closest('[data-vf-act]');
      if (!b || !box.contains(b)) return;
      const name = b.getAttribute('data-vf-act');
      if (name === 'read') VF().markReviewed(obj, field);
      else if (name === 'ask') VF().requestEnglish(obj, field);
      else if (name === 'keep') VF().cancelRequest(obj, field);
      if (o.onChange) o.onChange(obj, field, name);
      paint(obj);
    };
  }

  // How many English lines a file still owes Claude, design blocks included.
  function owed(root) {
    if (!root) return 0;
    let blocks = 0;
    VF().walk(root, (obj) => {
      ((obj.design && obj.design.blocks) || []).forEach((b) => { blocks += ((b && b.enTodo) || []).length; });
    });
    return VF().pending(root).filter((p) => p.state === 'todo').length + blocks;
  }

  function assetBase() {
    const host = (window.AppState && window.AppState.host) || {};
    return host.assetBase || (/^\/admin(\/|$)/.test(location.pathname) ? '/' : '/game/');
  }
  // The Vietnamese catalogue a content file is translated by, or null when it has none yet.
  async function loadCatalog(rel) {
    if (!rel) return null;
    try {
      const r = await fetch(assetBase() + 'locales/vi/' + String(rel).split('\\').join('/') + '?t=' + Date.now(), { cache: 'no-store' });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }

  // Said once after a save that leaves English for Claude to write.
  function toastOwed(n) {
    if (!n || !window.Toast) return;
    window.Toast.info(esc(T('{n} English line(s) wait for Claude. Ask: “dịch phần tiếng Anh đang chờ”.', { n })), esc(T('Vietnamese first')));
  }

  window.HVViField = { STATE, chip, actions, html, bind, owed, modeOf, assetBase, loadCatalog, toastOwed };
}());
