/**
 * The admin speaks Vietnamese first — window.AdminLang and window.T.
 *
 * The panel's code keeps writing its interface in English, and this file puts it into
 * Vietnamese on the way to the screen: admin/public/js/lang.vi.js holds one entry per English
 * string, and a MutationObserver translates every piece of interface text as it is drawn —
 * static HTML, a table a view just rendered, a toast — so no view has to know which language
 * it is in. English stays one click away (the VI | EN switch in the header), and is simply the
 * panel with the translation turned off.
 *
 * What it translates, in order:
 *   1. an element whose whole innerHTML is an entry — a sentence with <b> or <code> inside it
 *      is one entry, so its word order survives translation;
 *   2. a text node whose text is an entry, or matches a template entry ("{n} questions");
 *   3. title, placeholder, aria-label and data-placeholder attributes.
 * What it never touches: anything inside [translate="no"] (curriculum content — a gloss that
 * happens to read "Food" is not the interface), a contenteditable area, form values, iframes.
 *
 * Code that builds a string with numbers in it, or that goes to window.confirm, calls
 * T('Delete question {n}?', { n }) — the same entry, looked up directly.
 */
(function () {
  'use strict';

  const STORE = 'hv_admin_lang';
  let lang = 'vi';
  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'vi' || saved === 'en') lang = saved;
  } catch (e) { /* private mode: Vietnamese */ }

  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const VI = window.HV_ADMIN_VI || {};
  const exact = new Map();
  const templates = [];
  // A count stands for digits and nothing else. Left as "anything", "Unit {n}" would read
  // "Unit 10 quiz saved (5 questions)" as unit number "10 quiz saved (5 questions)".
  const NUMERIC = { n: 1, a: 1, b: 1, count: 1, total: 1, num: 1 };
  Object.keys(VI).forEach((k) => {
    const key = norm(k);
    exact.set(key, VI[k]);
    if (!/\{\w+\}/.test(key)) return;
    const names = [];
    const pattern = key.split(/(\{\w+\})/).map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (m) { names.push(m[1]); return NUMERIC[m[1]] ? '(\\d[\\d,.]*)' : '(.+?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    const prefix = key.split(/\{\w+\}/)[0];
    templates.push({ re: new RegExp('^' + pattern + '$'), names, out: VI[k], prefix });
  });

  function fill(text, names, values) {
    let out = text;
    names.forEach((n, i) => { out = out.split('{' + n + '}').join(values[i]); });
    return out;
  }
  function fromTemplate(text) {
    for (let i = 0; i < templates.length; i++) {
      const tp = templates[i];
      if (tp.prefix ? text.indexOf(tp.prefix) !== 0 : !/\d/.test(text)) continue;
      const m = tp.re.exec(text);
      if (m) return fill(tp.out, tp.names, m.slice(1));
    }
    return null;
  }

  /** The Vietnamese for an English interface string, with {name} values filled in. */
  function t(s, vars) {
    let out = String(s == null ? '' : s);
    if (lang === 'vi') {
      const key = norm(out);
      const hit = exact.get(key);
      if (hit !== undefined) out = hit;
      else if (!vars) { const tp = fromTemplate(key); if (tp !== null) out = tp; }
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, n) => (Object.prototype.hasOwnProperty.call(vars, n) ? String(vars[n]) : m));
    return out;
  }

  const ATTRS = ['title', 'placeholder', 'aria-label', 'data-placeholder'];
  const SKIP = 'script, style, textarea, iframe, svg, [translate="no"], [contenteditable="true"], .hre-area';
  const MIXED = 'p, span, div, label, h1, h2, h3, h4, h5, li, small, button, a, td, th, option, summary, b, strong, em, dt, dd, legend, figcaption';
  const skipped = (el) => !!(el && el.closest && el.closest(SKIP));

  function translateText(node) {
    const raw = node.nodeValue;
    const key = norm(raw);
    if (!key || !/[A-Za-z]/.test(key)) return;
    let hit = exact.get(key);
    if (hit === undefined) hit = fromTemplate(key);
    if (hit === null || hit === undefined || hit === key) return;
    const lead = /^\s*/.exec(raw)[0];
    const trail = /\s*$/.exec(raw)[0];
    node.nodeValue = lead + hit + trail;
  }

  function translateAttrs(el) {
    ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      const v = el.getAttribute(a);
      const key = norm(v);
      if (!key || !/[A-Za-z]/.test(key)) return;
      let hit = exact.get(key);
      if (hit === undefined) hit = fromTemplate(key);
      if (hit !== null && hit !== undefined && hit !== v) el.setAttribute(a, hit);
    });
  }

  // Only a run of prose with inline formatting inside it is translated as a whole — never an
  // element holding buttons or inputs, whose listeners would not survive a new innerHTML.
  const INLINE = { B: 1, STRONG: 1, I: 1, EM: 1, CODE: 1, SMALL: 1, U: 1, S: 1, SPAN: 1, A: 1, BR: 1, KBD: 1, SUP: 1, SUB: 1, MARK: 1 };
  function translateMixed(el) {
    if (!el.childElementCount || el.childElementCount > 12) return false;
    const inner = el.getElementsByTagName('*');
    for (let i = 0; i < inner.length; i++) if (!INLINE[inner[i].tagName]) return false;
    const html = el.innerHTML;
    if (html.length > 3000 || !/[A-Za-z]/.test(html)) return false;
    const hit = exact.get(norm(html));
    if (hit === undefined || hit === html) return false;
    el.innerHTML = hit;
    return true;
  }

  function translateTree(root) {
    if (lang !== 'vi' || !root) return;
    if (root.nodeType === 3) {
      if (!skipped(root.parentElement)) translateText(root);
      return;
    }
    if (root.nodeType !== 1 || skipped(root)) return;
    const mixed = [root].concat(Array.from(root.querySelectorAll(MIXED)));
    mixed.forEach((el) => { if (el.isConnected !== false && !skipped(el)) translateMixed(el); });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const texts = [];
    let n;
    while ((n = walker.nextNode())) texts.push(n);
    texts.forEach((tn) => { if (!skipped(tn.parentElement)) translateText(tn); });
    const withAttrs = [root].concat(Array.from(root.querySelectorAll('[title], [placeholder], [aria-label], [data-placeholder]')));
    withAttrs.forEach((el) => { if (!skipped(el)) translateAttrs(el); });
  }

  let observer = null;
  function observe() {
    if (lang !== 'vi' || observer || typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver((records) => {
      records.forEach((r) => {
        if (r.type === 'childList') r.addedNodes.forEach((node) => translateTree(node));
        else if (r.type === 'characterData') translateTree(r.target);
        else if (r.type === 'attributes' && r.target.nodeType === 1 && !skipped(r.target)) translateAttrs(r.target);
      });
      // What this pass wrote is already Vietnamese; its own mutations need no second look.
      observer.takeRecords();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function setLang(next) {
    if (next !== 'vi' && next !== 'en') return;
    try { localStorage.setItem(STORE, next); } catch (e) { /* nothing to keep it in */ }
    location.reload();
  }

  // The switch in the header: the language the panel speaks, not the language of the content.
  function paintSwitch() {
    const box = document.getElementById('admin-lang');
    if (!box) return;
    box.innerHTML = ['vi', 'en'].map((c) => '<button type="button" data-lang="' + c + '" class="' + (c === lang ? 'on' : '') + '"'
      + ' title="' + (c === 'vi' ? 'Giao diện tiếng Việt' : 'English interface') + '">' + c.toUpperCase() + '</button>').join('');
    box.querySelectorAll('[data-lang]').forEach((b) => { b.onclick = () => { if (b.getAttribute('data-lang') !== lang) setLang(b.getAttribute('data-lang')); }; });
  }

  function start() {
    document.documentElement.setAttribute('lang', lang);
    paintSwitch();
    translateTree(document.body);
    observe();
  }

  window.AdminLang = { get lang() { return lang; }, t, setLang, translateTree, entries: exact.size };
  window.T = t;
  // The browser's own dialogs are text nobody's observer can see. Every view calls them with
  // English, so they are translated here, once, rather than at forty call sites.
  ['confirm', 'alert', 'prompt'].forEach((name) => {
    const native = window[name];
    if (typeof native !== 'function') return;
    window[name] = function (msg) {
      const args = Array.prototype.slice.call(arguments);
      args[0] = t(msg);
      return native.apply(window, args);
    };
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
