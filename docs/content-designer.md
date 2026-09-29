# The Designer — formatting and laying out study-desk pages

The admin's **✨ Designer** tab edits a study-desk page (every `*-workbook.json`,
`*-textbook.json`, `review*-workbook.json` and exam bank) the way it looks rather than the
way it is stored. The page is drawn on the left with the game's own stylesheets; the panels on
the right change it:

| Panel | What it does |
|---|---|
| ✏️ **Text** | Click any sentence on the page. Bold, italic, underline, strike, size, colour, highlight, font, a **meaning on hover** (💬), a reading above the text (ruby), lists, quotes, pictures inside the text. Below it: the whole field's size, alignment, **box** (note, tip, info, careful, important, grammar, example, quote, card, dashed), colour, font, bold, italic. |
| 🎨 **Page** | Theme (parchment, notebook, mint, sky, blossom, lavender, sand), width, question **columns**, spacing, **zoom**, the Korean font, and when hover meanings appear — for this page, or as the default for every page of the bank. |
| 🧱 **Blocks** | Text boxes, pictures and dividers placed between the page's sections: top, after the instruction, after the [보기], after the questions, with the answers, bottom. A text box can have a heading, an icon, a box style, two columns and a picture beside it; a picture has a width, alignment, frame and caption. Each can show always, only before checking, or only after. |
| 💬 **Meanings** | The page's (or bank's) glossary — a word and the meaning it shows on hover, in Vietnamese and (optionally) English — the words never glossed automatically, and the list of words the game glosses by itself on this page, each with *Hide* and *Change*. |
| ❓ **Question** | The rows themselves, for every exercise type: lines with their `{}` blanks, the buttons and which one is right, a second blank, the shared box, the English, the explanation, the grammar note, the recording, the picture key. Add, duplicate, move and delete questions. |

The bar above holds the bank and page pickers, **Questions / Answers** (the page as the
learner meets it, or after checking with the explanations open), **Content VI / EN**, a phone
and tablet width, undo and redo (Ctrl+Z / Ctrl+Y), and **Save** (Ctrl+S). A save goes through the
same registry and validator as every other admin save; a refusal names the exercise and
question, and *Show me →* opens it.

The content is written **Vietnamese first** ([vietnamese-first.md](vietnamese-first.md)). In
**VI** the Text panel and the question fields edit the Vietnamese — a draft beside the English
until Claude writes the English from it — and its formatting goes to `fmt.<field>.vi`; the
English shows beneath with where it stands (⏳ owed, 🤖 written by Claude and unread, ✓ up to
date). **EN** shows Claude's English to style it; its words change only through the Vietnamese.
The ⏳ count in the bar is the English this bank still owes. A meaning on hover takes its
Vietnamese first; the English one is optional, and English mode shows the Vietnamese until it
is written.

## How formatting is stored — beside the text, never in it

The curriculum's strings are load-bearing: a `lines[].ko` is split on `{}`, spoken by the TTS
(whose clip name is the hex of the exact text) and compared letter by letter in dictation; an
English `why` is the key its Vietnamese translation is filed under. So the Designer never
writes markup into a string. It writes an overlay beside it:

```json
{
  "why": "진한 is 진하다 with the adjective modifier -(으)ㄴ …",
  "fmt": {
    "why": {
      "html": "<b>진한</b> is 진하다 with the adjective modifier <mark>-(으)ㄴ</mark> …",
      "vi":   "<b>진한</b> là 진하다 cộng đuôi định ngữ …",
      "size": "lg", "box": "tip", "align": "left", "color": "blue", "font": "serif",
      "bold": true, "italic": true
    },
    "*": { "box": "warn" }
  }
}
```

- `html` is the field's text with formatting. It is only drawn while it reads exactly as the
  field does (`HVRich.matches`, whitespace aside). Edit the words somewhere else and the page
  shows the new words plainly rather than the old ones prettily; the validator refuses to save
  an overlay in that state, and says where.
- `vi` is the same for the Vietnamese translation, drawn only while it matches the
  translation the catalogue holds. The Designer styles a translation but does not change its
  words — that is the Translate tab's job.
- `size`, `align`, `box`, `color`, `font`, `bold`, `italic` say nothing about the words, so
  they apply in every language and survive any edit.
- `"*"` styles the object as a whole — a question row with a box of its own.

A page or a bank can also carry a `design`:

```json
"design": {
  "theme": "mint", "width": "wide", "scale": 1.1, "cols": 2, "font": "round", "density": "airy",
  "glossMode": "checked",
  "glossary": [{ "ko": "눈썹", "gl": "eyebrow", "vi": "lông mày" }],
  "glossHide": ["진한"],
  "blocks": [
    { "id": "b1", "kind": "text", "at": "instruction", "heading": "Mẹo", "icon": "💡", "html": "<b>Tip:</b> …", "box": "tip" },
    { "id": "b2", "kind": "image", "at": "top", "src": "media/banner-3fa9c1d2e4ab.png", "width": 60, "frame": "shadow", "caption": "…" },
    { "id": "b3", "kind": "divider", "at": "items", "style": "dots" }
  ]
}
```

A bank's design is the starting point for every page; a page's own settings win, glossaries
merge (the page's entry for a word wins) and so do hidden words. A bank's blocks go on its
exercise list (`top` / `bottom`).

None of these keys is a field the translation scanner reads (`HV_TEXT_FIELDS`), so formatting
never shows up in the Translate tab as a sentence to translate; `tests/test_rich_text.js`
holds that.

## What the text box may contain

`js/richText.js` sanitizes every overlay on save *and* on draw — the same string parser in the
admin, the validators and the game. It keeps `b i u s sub sup small mark span br hr p ul ol li
blockquote h3 h4 ruby rt rp img` and nothing else. An element that is not on the list is
unwrapped (its text kept); script, style, SVG, frames, forms and media are dropped with their
contents. No attribute is ever copied: `class` is rebuilt from the listed tokens (`hv-sz-*`,
`hv-c-*`, `hv-hl-*`, `hv-f-*`, `hv-al-*`, `hv-gl`, `hv-img-*`), a meaning is `data-gl` /
`data-gl-vi`, and a picture's `src` must be a file under `media/` or `sprites/`. The output is
balanced and idempotent.

## Where it shows

The game reads formatting in the study-desk page renderer (`renderWorkbook`, `wbLineHtml`,
`wbTopikWhyHtml` and the list page in `js/ui.js`) through `wbFmt` and friends, which fall back
to exactly the old escaping when there is nothing to apply — an unformatted bank renders byte
for byte as it did before, which `tests/test_rich_text.js` checks by rendering banks with and
without the layer loaded. The page's design lands as classes on `#workbook-panel` (styled in
`css/rich.css`) and its blocks in the `wb-blocks-*` hosts in `index.html`.

Hover meanings: the automatic pass (`wbGlossTable` / `wbApplyGloss`) merges the design's
glossary over the world's word list and skips its hidden words. `glossMode` decides when it
runs: `checked` (the default — after the answer is out, so it never points at the word a
question turns on), `always` (a reading aid) or `off`. `scripts/validate_content.js` refuses
`always` on an exam bank. A meaning written into the text itself (💬) always shows. A glossary
word must be two characters or more; a single syllable is glossed in the text instead, since
it would otherwise light up inside every longer word.

The desk quiz, the cassette scripts and the word cards do not read formatting yet.

## An exam explanation, one paragraph at a time

An exam page (`examView`, and the TOPIK paper) draws a question's `why` in pieces, split where
its writer left a blank line: the first paragraph is the card **01 · 핵심 단서 · WHAT TO
NOTICE**, the rest are the numbered steps under **선택지 비교 · FULL REASONING**. On that page
each piece is picked on its own — the preview tags them `…items.3.why#0`, `…why#1`… — and the
Text panel edits only that paragraph: what is typed replaces it in the whole field, text and
formatting alike (`R.textParagraphs` and `R.paragraphsOf` split the two at the same places),
and a blank line typed into it makes two steps of it. The bar above the editor moves to the
paragraph before or after, adds a step after this one, deletes this one, or opens the whole
field. In EN the words are Claude's, so only formatting can change there. The field's size,
colour, font and emphasis reach every paragraph; its box does not, the cards being boxes already.

## Custom fields on a question

**❓ Question → Trường tùy chỉnh** adds fields of the author's own to a question: a heading and
a text each, stored as `item.extra = [{ id, labelEn, noteEn }]`. They are prose like the rest of
the row — written in Vietnamese first (drafts `labelVi` / `noteVi`, the English on `enTodo`),
filed in the catalogue by the batch, formatted in the Text panel like any field — and they show
with the answer: on an exam page as more cards after the clue and the rule (03, 04…), elsewhere
as boxes under the grammar note (`.wb-learn-extra`, `.wb-why-extra` in `css/rich.css`). One left
empty is dropped on save; a question holds at most twelve. For content that belongs to the page
rather than to one question, use a text box in 🧱 Blocks.

## Pictures — `media/`

Uploads live in `media/`, not `sprites/` (every PNG under `sprites/` must be a catalogued
art-library asset). `admin/lib/media.js` holds the rules both halves of the admin apply:

- the type is decided by the file's bytes: PNG, JPEG, WebP or GIF — never SVG, which can carry
  script;
- at most 3 MB (the Designer shrinks a large photo to 1600px WebP before it uploads; small
  pictures, pixel art above all, go up exactly as they are);
- the name is a readable slug of the original name plus the content's hash, so the same picture
  uploaded twice is one file.

**Locally** an upload is a file written into the checkout's `media/` — commit it with the bank
that uses it, and `npm run publish:prod` puts it on R2 (`scripts/r2Content.js`). **On the
deployed admin** an upload is committed to GitHub and put on R2 at once, like a content save.
`vercel.json` rewrites `/media/*` to the CDN (cached for good — the names never change),
`main.py` serves the folder on the desktop build, and `validate_content.js` fails if a design
points at a picture that is not on disk. The picture picker also offers the game's own art.

## Things to know

- **Changing English words orphans their Vietnamese translation.** The catalogues are keyed by
  the English text, and CI fails while any entry is stale (`validate_content.js`,
  `tests/test_i18n.js`). Re-translate the line in the Translate tab before committing. Styling
  alone never does this; the Text panel says so on every English field.
- **Changing Korean words** is safe for translations; a line over about 40 syllables would give
  a TTS clip name longer than the filesystem allows, which `validate_content.js` reports.
- **A save changes only what was edited.** The validator lays its cleaned output back over the
  bank's own key order (`keepShape` in `admin/lib/workbook.js`), so every bank round-trips byte
  for byte and a save's diff is the edit.
- **The preview is a replica.** `admin/public/js/designerPreview.js` writes the page's markup
  itself — `renderWorkbook` lives in a file that wires up the whole game and cannot run alone —
  using the same classes, the same `HVRich` calls and the same stylesheets. If the page's
  structure changes in `js/ui.js`, bring the preview along.
- **The Workbooks tab** still edits the same files in its compact form. Editing a formatted
  field's words there drops that field's formatted copy (keeping its box and size), because a
  copy of other words would be refused on save; it says so when it happens.
- **Taking a style off part of a styled run works.** Removing the colour, size, highlight or
  font from a few words inside a longer run — or clearing formatting from them — splits the run
  around them (`liftOut` in `richEditor.js`) rather than putting the words back inside it.
  *Clear formatting* with nothing selected keeps the meanings, pictures and line breaks.
- **Pasting from Word or Google Docs** keeps bold, italic, underline and strike written as
  styles, and no longer turns a whole Docs paste bold (Docs wraps it in
  `<b style="font-weight:normal">`).
- **A field's line breaks live in its formatting layer.** The game's explanation boxes collapse
  plain newlines, so a Vietnamese text with its own line breaks keeps a layer of `<br>`s even
  with no other formatting — the field list shows it as formatted, and *Remove all formatting*
  keeps those breaks.

## Files

| File | Role |
|---|---|
| `js/richText.js` | Vocabulary, sanitizer, overlay reading, design helpers, validators — shared by game, admin and scripts |
| `css/rich.css` | Every style the layer can emit; loaded by the game and the Designer |
| `js/ui.js` | The study-desk renderer reads `fmt` and `design` (`wbFmt`, `wbApplyDesign`, `wbGlossTable`) |
| `admin/public/js/designer.js` | The tab: state, history, panels, pictures, save |
| `admin/public/js/designerPreview.js` | The live page in an iframe |
| `admin/public/js/richEditor.js` | The rich text box |
| `admin/lib/workbook.js` | Keeps `fmt` and `design` on save, refuses stale overlays, keeps the file's shape |
| `admin/lib/media.js` | Upload rules; `/api/admin/media` locally and on Vercel |
| `tests/test_rich_text.js`, `admin/test/test_designer.js` | The guarantees above |
