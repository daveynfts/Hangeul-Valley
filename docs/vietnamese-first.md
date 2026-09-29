# Vietnamese first — the admin in Vietnamese, the content written in Vietnamese

The admin speaks Vietnamese, and the curriculum's prose — the meanings, explanations, grammar
notes, instructions, quiz questions — is written in it. English is the second language: Claude
writes it from the Vietnamese, in batches, when asked. Korean is the subject and is never
translated.

Two separate things are Vietnamese here, and they work differently:

| | What | Where it lives |
|---|---|---|
| **The interface** | the admin's own buttons, labels, messages | `admin/public/js/lang.vi.js` |
| **The content** | the prose a learner reads in the game | the content files and `locales/vi/` |

## The interface

The panel opens in Vietnamese. The **VI | EN** switch in the header changes it (kept in
`localStorage` as `hv_admin_lang`); English is simply the panel with the translation turned off.

The code keeps writing its interface in English. `admin/public/js/lang.js` puts it into
Vietnamese on the way to the screen: a `MutationObserver` looks every piece of text up in
`lang.vi.js` as it is drawn — static HTML, a table a view just rendered, a toast, a modal — and
`window.confirm` / `alert` / `prompt` are translated too. So a view never has to know which
language it is in.

An entry is keyed exactly as the panel draws the text:

```js
'Save': 'Lưu',                                              // text on its own
'Showing {a}-{b} of {n} entries': 'Đang hiện {a}-{b} trong {n} mục',  // a template
'Saves write to <code>worlds/</code>.': 'Khi lưu sẽ ghi vào <code>worlds/</code>.',  // with markup
```

- `{n}`, `{a}`, `{b}`, `{count}`, `{total}`, `{num}` match numbers only; any other `{name}`
  matches any text. (Without the rule, `Unit {n}` read "Unit 10 quiz saved (5 questions)" as
  unit number "10 quiz saved (5 questions)".)
- A sentence with `<b>`, `<code>` or `<em>` in it is one entry, so its word order can change.
- Code that builds a sentence out of parts calls `T('… {name} …', { name })` — the same
  dictionary, looked up directly — rather than concatenating English.
- **Content is never translated as interface.** Anything drawn from the curriculum is marked
  `translate="no"` (a word list cell, a bank name, an art asset's name), so a gloss that happens
  to read "Food" stays the content it is.

Adding a screen: write it in English as before, then add its strings to `lang.vi.js`.
`admin/test/test_admin_lang.js` fails on any text in `index.html` with no entry, on an entry
that loses a `{placeholder}` or a tag, and on two keys that are the same key. For what
JavaScript draws, open the screen and look — the strings still in English are the ones to add.

## Writing the content in Vietnamese

Every form that edits the prose shows the **Vietnamese** in the box and **Claude's English**
under it, read only, with a chip saying where that English stands:

| Chip | Means |
|---|---|
| ⏳ **Chờ Claude viết tiếng Anh** | the Vietnamese changed; the English will be (re)written from it |
| ↻ **Chờ lưu vào catalogue** | a Vietnamese draft beside English that stays as it is |
| 🤖 **Tiếng Anh do AI viết — chưa đọc** | Claude wrote this English; nobody has read it yet |
| ⚠ **Chưa có tiếng Việt** | English with no Vietnamese anywhere |
| 한 **Giữ nguyên** | Korean (or a name): shown the same in every language |
| ✓ **Đã khớp** | nothing to do |

Beside the English: **✓ Đánh dấu tiếng Anh đã đọc**, **✍ Nhờ Claude viết lại tiếng Anh**,
**Giữ nguyên tiếng Anh**. The English is never typed here — to change what it says, change the
Vietnamese, or ask for a new English.

| Where | What is written in Vietnamese |
|---|---|
| ✨ Thiết kế (Designer) | every prose field on the page, and its formatting (`fmt.<field>.vi`); a **Nội dung VI / EN** switch shows the English to style it |
| Sách bài tập (Workbooks) | section, instruction, list blurb, note; each question's meaning, why, grammar note; the worked example's meaning |
| Bài học → Quiz bàn học | the prompt and the four answers — each one either Vietnamese (**VI**) or Korean typed as itself (**한**); the switch beside the box says which a new answer is |
| Bài học → Từ vựng | the meaning, the group name (typed once for the whole group — every word in it follows) and the example's translation |
| Cấp độ (Levels) | a word's meaning; a level's name and description |
| 💬 Meanings | a meaning on hover — a glossary word's, or one written into the text — in Vietnamese, the English optional; line breaks allowed |
| ❓ Question → Trường tùy chỉnh | a question's own fields — a heading and a text each (`extra[].labelEn` / `noteEn`, drafts `labelVi` / `noteVi`) |

### What a save stores

A Vietnamese edit is kept **beside** the English it will replace, under the name the game
already reads a translation from (`en` → `vi`, `xxxEn` → `xxxVi`, otherwise `+Vi`):

```json
{
  "why": "진한 is 진하다 with …",
  "whyVi": "진한 là 진하다 cộng …",
  "enTodo": ["why"],
  "enAI": ["why"]
}
```

- `whyVi` — the author's draft. Writing back exactly what the catalogue already files under the
  English removes it again.
- `enTodo` — English still to write (or rewrite) from the Vietnamese.
- `enAI` — English Claude wrote that no person has marked as read.

A brand-new line can be saved with only its Vietnamese (`"en": ""` plus `"vi"`); the validators
put it on `enTodo` whatever the save said. The model is `admin/public/js/viFirst.js`, shared by
the admin, the validators and the batch script.

### What the game shows meanwhile

`js/i18n.js`: a draft wins over the catalogue, so Vietnamese mode shows the new Vietnamese at
once. English mode shows the English — or, for a line that has no English yet, the Vietnamese
rather than a blank. A meaning on hover written only in Vietnamese shows its Vietnamese in both.

## The batch — Claude's side

When asked (for example "dịch phần tiếng Anh đang chờ"), run from the repo root:

```bash
node scripts/vi_first.js status
```

```bash
node scripts/vi_first.js todo --out <scratchpad>/todo.json
```

Each worklist item carries the file, the path, the field, `where` (exercise · question), `ko`
(the Korean the line is about — never translate from the Vietnamese alone), `vi` (write the
English from this), `enBefore` (the English it replaces — keep its terminology and register
where the Vietnamese did not change the meaning) and an empty `en`. An item with `also` stands
for the same Vietnamese over the same English in several places — a group name shared by forty
words — and gets one English for all of them. A `kind: "block"` item is a design text box whose
field is HTML: keep the Vietnamese's own `<b>`, `<i>`, `<mark>` in the English.

Fill in every `en`, then:

```bash
node scripts/vi_first.js apply <scratchpad>/todo.json
```

`apply` checks each Vietnamese is still what the worklist saw (a line edited since is skipped,
not overwritten), writes the English, drops formatting that no longer reads the same, moves the
line from `enTodo` to `enAI` (English that came out unchanged is not marked), saves through the
file's own validator, and **files** the Vietnamese: into `locales/vi/<file>` under
`field|English`, out of the content file, with the catalogue entries the old English left
behind pruned — so `validate_content`'s "no stale translations" gate stays green.

Then the gates, and a commit only when asked:

```bash
npm run validate
```

```bash
npm test
```

```bash
npm run i18n:check
```

Other commands: `settle` files drafts whose English is current (the ↻ ones) without writing any
English; `ai --out f.json` lists Claude's unread English beside its Vietnamese, and
`reviewed f.json` marks that list as read.

## What CI says

`scripts/validate_content.js` counts the drafts, to-dos and unread AI English, and **lists the
lines that have only Vietnamese** so far — as a note, not a failure. The deployed admin commits
straight to `main`, and a custom field or any new line written there in Vietnamese waits for
Claude's English by design; failing on it left `main` red, and Publish stopped, after every such
save. English mode shows the Vietnamese for those lines meanwhile. (A brand-new *question* with
no English prose still fails the unit's own suites, which want its meaning, why and grammar note
in English — write those through the batch before relying on CI.)

## Limits

- The **Dịch (Translate)** tab still edits the catalogue by English key. A draft outranks the
  catalogue until it is filed, so edit a line's Vietnamese in the form that owns it.
- The farm layout's station names are not a catalogued file; they stay English/Korean labels.
- The batch runs where the repo is — locally, by Claude. The deployed admin writes drafts; it
  never writes English.
- The deployed Levels tab is read-only (it has no write routes on Vercel), as before.
