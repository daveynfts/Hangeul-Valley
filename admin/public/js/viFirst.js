/**
 * Vietnamese first — the curriculum's prose written in Vietnamese, its English written after
 * it by Claude, in batches. window.HVViFirst in the admin; require()d by the validators and by
 * scripts/vi_first.js.
 *
 * The game has always read English as the source and Vietnamese from a catalogue keyed by that
 * English (`field|English`, locales/vi/<file>). Turning that around file by file would touch
 * every bank and every translation; instead a Vietnamese edit is kept beside the text it
 * translates, under the name the game already reads a translation from:
 *
 *   why       "진한 is 진하다 with …"          the English, unchanged until Claude rewrites it
 *   whyVi     "진한 là 진하다 cộng …"          the Vietnamese the author just wrote (a draft)
 *   enTodo    ["why"]                           English to write from the Vietnamese
 *   enAI      ["why"]                           English Claude wrote, not yet read by a person
 *
 * js/i18n.js lets such a draft win over the catalogue, so the game shows the new Vietnamese at
 * once; when the English is missing it shows the Vietnamese in English mode as well. When
 * Claude runs the batch (docs/vietnamese-first.md), the English is written, the Vietnamese is
 * filed in the catalogue under it, and the draft goes — back to the one storage model the rest
 * of the repo reads. The English carries `enAI` until a person marks it read.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && typeof module.exports === 'object') module.exports = api;
  else if (root) root.HVViFirst = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // js/i18n.js HV_TEXT_FIELDS and hvLangField, restated so the admin page need not load the
  // game's i18n script (it defines globals the panel has its own versions of).
  // tests/test_vi_first.js fails the moment the two disagree.
  const TEXT_FIELDS = [
    'en',
    'categoryEn', 'nameEn', 'descriptionEn', 'titleEn', 'instructionEn', 'blurbEn',
    'noteEn', 'exampleEn', 'sectionEn', 'secEn', 'pickEn', 'checkEn', 'againEn',
    'backEn', 'doneEn', 'hintEn', 'promptEn', 'subtitleEn', 'labelEn',
    'why', 'grammar', 'q', 'A', 'B', 'C', 'D',
    'note', 'l', 'description', 'source', 'title',
    'pages'
  ];
  const TODO = 'enTodo';
  const AI = 'enAI';

  function viField(field) {
    const f = String(field);
    if (f === 'en') return 'vi';
    if (f.length > 2 && f.slice(-2) === 'En') return f.slice(0, -2) + 'Vi';
    return f + 'Vi';
  }
  const DRAFT_FIELDS = TEXT_FIELDS.map(viField);
  function isText(field) { return TEXT_FIELDS.indexOf(field) >= 0; }

  // js/i18n.js hvIsTranslatable, restated for the same reason: whether this one value in a
  // translatable field is English prose, or a Korean answer, an id or a path that the game
  // shows as it is in every language. tests/test_vi_first.js runs both over every string the
  // catalogues cover and fails on the first they disagree about.
  const PROSE_FIELDS = ['why', 'grammar'];
  function translatable(value, field) {
    if (typeof value !== 'string') return false;
    const s = value.trim();
    if (!s) return false;
    if (!/[A-Za-z]{2}/.test(s)) return false;
    if (!/\s/.test(s) && (s.indexOf('_') >= 0 || s.indexOf('/') >= 0)) return false;
    if (/^https?:/i.test(s)) return false;
    if (/\.(png|jpe?g|webp|gif|mp3|ogg|wav|json|js)$/i.test(s)) return false;
    if (PROSE_FIELDS.indexOf(field) >= 0) return true;
    const hangul = (s.match(/[가-힣]/g) || []).length;
    if (hangul) {
      const latin = (s.match(/[A-Za-z]/g) || []).length;
      if (latin <= hangul) return false;
    }
    return true;
  }
  // Three draft names stand for two fields each — noteVi for noteEn and note, titleVi for titleEn
  // and title, descriptionVi for descriptionEn and description — so the object decides: the
  // field it actually holds. With neither (or both), the En form, as before.
  function fieldOfDraft(name, obj) {
    const all = TEXT_FIELDS.filter((f, i) => DRAFT_FIELDS[i] === name);
    if (!all.length) return null;
    if (all.length > 1 && obj && typeof obj === 'object') {
      const held = all.filter((f) => typeof obj[f] === 'string');
      if (held.length === 1) return held[0];
    }
    return all[0];
  }
  function key(field, text) { return String(field) + '|' + String(text).trim(); }

  function list(obj, name) {
    return obj && Array.isArray(obj[name]) ? obj[name].filter((s) => typeof s === 'string') : [];
  }
  function setList(obj, name, items) {
    const seen = [];
    items.forEach((s) => { if (seen.indexOf(s) < 0) seen.push(s); });
    if (seen.length) obj[name] = seen; else delete obj[name];
  }
  function draftOf(obj, field) {
    const v = obj ? obj[viField(field)] : null;
    return typeof v === 'string' && v.trim() ? v : '';
  }
  // The Vietnamese the catalogue files under this object's English, if there is one.
  function filedOf(obj, field, entries) {
    const en = obj && typeof obj[field] === 'string' ? obj[field].trim() : '';
    return en && entries && typeof entries[key(field, en)] === 'string' ? entries[key(field, en)] : '';
  }
  /** The Vietnamese this field reads as: the author's draft, else the catalogue's. */
  function viOf(obj, field, entries) { return draftOf(obj, field) || filedOf(obj, field, entries); }

  /**
   * Where a field stands:
   *   todo          its English is to be written (or rewritten) from the Vietnamese
   *   sync          a Vietnamese draft waiting to be filed under English that is current
   *   ai            English Claude wrote from the Vietnamese, not yet read by a person
   *   source        not English at all — a Korean answer, an id — shown as it is everywhere
   *   untranslated  English with no Vietnamese anywhere
   *   ok            nothing to do
   */
  function status(obj, field, entries) {
    if (list(obj, TODO).indexOf(field) >= 0) return 'todo';
    if (draftOf(obj, field)) return 'sync';
    if (list(obj, AI).indexOf(field) >= 0) return 'ai';
    const v = obj && typeof obj[field] === 'string' ? obj[field] : '';
    if (v.trim() && !translatable(v, field)) return 'source';
    if (v.trim() && !filedOf(obj, field, entries)) return 'untranslated';
    return 'ok';
  }

  /**
   * The author wrote Vietnamese for a field. Anything that differs from what the catalogue
   * files is kept as a draft and puts the English on the list to be rewritten; writing back
   * exactly the filed Vietnamese (or nothing) takes the draft away again.
   */
  function setVi(obj, field, text, entries) {
    const t = String(text == null ? '' : text).trim();
    const filed = String(filedOf(obj, field, entries) || '').trim();
    const name = viField(field);
    if (!t || (filed && t === filed)) {
      delete obj[name];
      setList(obj, TODO, list(obj, TODO).filter((f) => f !== field));
      return 'filed';
    }
    obj[name] = t;
    setList(obj, TODO, list(obj, TODO).concat([field]));
    return 'draft';
  }

  /** Ask for the English to be written again from the Vietnamese as it stands. */
  function requestEnglish(obj, field) {
    setList(obj, TODO, list(obj, TODO).concat([field]));
  }
  function cancelRequest(obj, field) {
    if (draftOf(obj, field) && !(typeof obj[field] === 'string' && obj[field].trim())) return false;
    setList(obj, TODO, list(obj, TODO).filter((f) => f !== field));
    return true;
  }
  /** A person has read Claude's English and it stands. */
  function markReviewed(obj, field) { setList(obj, AI, list(obj, AI).filter((f) => f !== field)); }

  /**
   * Is this field, on this object, prose written here in Vietnamese first? A Korean answer,
   * an id or a path in a translatable field is not — it reads the same in every language and
   * is edited as itself. An empty field is: its English is what Claude will write.
   */
  function isProse(obj, field) {
    if (!isText(field)) return false;
    if (draftOf(obj, field) || list(obj, TODO).indexOf(field) >= 0) return true;
    const v = obj ? obj[field] : undefined;
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) return true;
    return translatable(v, field);
  }

  /**
   * The field holds text shown as it is, in every language — a Korean answer typed over what
   * was English. Whatever it owed or was waiting for as English goes with it.
   */
  function setSource(obj, field, text) {
    obj[field] = String(text == null ? '' : text);
    delete obj[viField(field)];
    setList(obj, TODO, list(obj, TODO).filter((f) => f !== field));
    setList(obj, AI, list(obj, AI).filter((f) => f !== field));
  }

  /** Every object in a content file, with its path — "exercises.3.items.2". */
  function walk(root, fn) {
    const seen = new Set();
    (function go(node, path) {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) { node.forEach((v, i) => go(v, path ? path + '.' + i : String(i))); return; }
      fn(node, path);
      Object.keys(node).forEach((k) => {
        if (k === 'fmt' || k === 'design') return;
        const v = node[k];
        if (v && typeof v === 'object') go(v, path ? path + '.' + k : k);
      });
    }(root, ''));
  }

  /** What a file still owes: [{ path, field, state, obj }] for every to-do and every draft. */
  function pending(root) {
    const out = [];
    walk(root, (obj, path) => {
      const fields = new Set(list(obj, TODO));
      Object.keys(obj).forEach((k) => {
        const f = fieldOfDraft(k, obj);
        if (f && typeof obj[k] === 'string' && obj[k].trim()) fields.add(f);
      });
      fields.forEach((f) => out.push({ path, field: f, state: list(obj, TODO).indexOf(f) >= 0 ? 'todo' : 'sync', obj }));
    });
    return out;
  }
  function countAI(root) {
    let n = 0;
    walk(root, (obj) => { n += list(obj, AI).length; });
    return n;
  }

  /**
   * The validators' half: carry an object's drafts and lists across a save, against the
   * cleaned object `out`. A draft is only kept for a translatable field the object has; a
   * field whose English is empty but has a draft is on the to-do list whatever the input said.
   * `where` names the place in a refusal.
   */
  function clean(out, src, where) {
    if (!src || typeof src !== 'object') return out;
    const bad = (msg) => { throw new Error(where + ': ' + msg); };
    Object.keys(src).forEach((k) => {
      const f = fieldOfDraft(k, out);
      if (!f) return;
      const v = src[k];
      if (v === undefined || v === null || v === '') return;
      if (typeof v !== 'string') bad(k + ' must be text');
      if (!Object.prototype.hasOwnProperty.call(out, f) || typeof out[f] !== 'string') bad(k + ' translates ' + f + ', which this entry does not have');
      const t = v.trim();
      if (t.length > 4000) bad(k + ' is longer than 4000 characters');
      if (t) out[k] = t;
    });
    [TODO, AI].forEach((name) => {
      if (src[name] === undefined || src[name] === null) return;
      if (!Array.isArray(src[name])) bad(name + ' must be a list of field names');
      const items = [];
      src[name].forEach((f) => {
        if (typeof f !== 'string' || !isText(f)) bad(name + ' names "' + f + '", which is not a translatable field');
        if (typeof out[f] !== 'string') bad(name + ' names ' + f + ', which this entry does not have');
        if (items.indexOf(f) < 0) items.push(f);
      });
      if (items.length) out[name] = items;
    });
    TEXT_FIELDS.forEach((f) => {
      if (typeof out[f] === 'string' && !out[f].trim() && draftOf(out, f)) {
        setList(out, TODO, list(out, TODO).concat([f]));
      }
    });
    if (out[TODO]) {
      out[TODO].forEach((f) => {
        if (!draftOf(out, f) && !(typeof out[f] === 'string' && out[f].trim())) bad(TODO + ' names ' + f + ', which has neither English nor Vietnamese');
      });
    }
    return out;
  }

  /** Is there Vietnamese to stand in for this empty English field? */
  function hasDraft(src, field) { return !!draftOf(src, field); }

  return {
    TEXT_FIELDS, DRAFT_FIELDS, TODO, AI,
    viField, isText, translatable, isProse, fieldOfDraft, key, list, draftOf, filedOf, viOf, status,
    setVi, setSource, requestEnglish, cancelRequest, markReviewed, walk, pending, countAI, clean, hasDraft
  };
}));
