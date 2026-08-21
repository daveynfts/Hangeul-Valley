// ═══════════════ WORKBOOK PIXEL ART ═══════════════════════════════════════════
//
// The textbook prints photographs. Dropping photographs into this game would look
// like a different product bolted on, so the workbook draws its own icons in the
// same idiom the rest of the game uses: a character matrix plus a palette, the
// exact format PixelArtRenderer takes in js/renderer.js.
//
// The difference is the target. PixelArtRenderer bakes a Phaser texture; a
// workbook page is DOM, so the same matrix is emitted as SVG rects instead. One
// rect per pixel, shape-rendering: crispEdges, so it scales without blurring and
// stays a drawing rather than a photo.
//
// Art lives in code and content lives in worlds/unit14-workbook.json, the same
// split the vocabulary already uses (js/vocabArtUnit14.js versus the world JSON).
// The JSON names an icon by key; this table owns what that key looks like.

const WORKBOOK_ART_PALETTE = {
  '.': null,
  'K': '#0f172a', // outline, as everywhere else in the game
  'W': '#fff8e8', // parchment white
  'w': '#f4d6a0', // parchment shade
  'd': '#cbd5e1', // cool light grey
  'b': '#94a3b8', // cool mid grey
  'B': '#475569', // cool deep grey
  'S': '#c4893a', // wood light
  's': '#8b5a2b', // wood mid
  'z': '#4a2a0d', // wood dark
  'm': '#fde047', // gold bright
  'M': '#f59e0b', // gold mid
  'y': '#b45309', // gold deep
  'r': '#f43f5e', // rose bright
  'R': '#b91c1c', // rose deep
  'g': '#4ade80', // green bright
  'G': '#166534', // green deep
  'c': '#38bdf8', // cyan bright
  'C': '#0369a1', // cyan deep
  'p': '#c084fc', // violet bright
  'P': '#7c3aed', // violet deep
  'X': '#ffddad', // skin
  'x': '#c87858'  // skin shadow
};

// 16x16, silhouette first: at this size a recognisable outline beats detail.
const WORKBOOK_ART = {
  // 러시아에 가다 — an onion dome. The one shape that reads as Russia at 16px.
  go_russia: [
    '.......K........',
    '......KmK.......',
    '.....KmMmK......',
    '....KrRRRrK.....',
    '...KrRRRRRrK....',
    '..KrRWRRRWRrK...',
    '..KRRRRRRRRRK...',
    '...KcCCCCCcK....',
    '....KWWWWWK.....',
    '....KWcCcWK.....',
    '...KWWWWWWWK....',
    '...KWcCcWcCK....',
    '..KWWWWWWWWWK...',
    '..KWcCcWWcCcK...',
    '.KsSSSSSSSSSsK..',
    '.KzzzzzzzzzzzK..'
  ],

  // 유명한 사람을 만나다 — a press camera mid-flash. A face with sparkles read
  // as headwear at this size; a lens and a burst do not.
  meet_famous: [
    '..KmK.......KmK.',
    '...m.........m..',
    '....KmK..KmK....',
    '..KWWK......m...',
    '..KWWK..........',
    '.KKKKKKKKKKKK...',
    '.KWddddddddWK...',
    '.KdKKKKKKKKdK...',
    '.KdKBBBBBBKdK...',
    '.KdKBCcccBKdK...',
    '.KdKBcWWcBKdK...',
    '.KdKBCcccBKdK...',
    '.KdKBBBBBBKdK...',
    '.KdKKKKKKKKdK...',
    '.KWddddddddWK...',
    '.KKKKKKKKKKKK...'
  ],

  // 연애편지를 쓰다 — an envelope with a heart, and a pencil.
  write_letter: [
    '..............KM',
    '.............KMy',
    '............KMyK',
    '.KKKKKKKKKKKKyK.',
    '.KWWWWWWWWWKKK..',
    '.KwWWWWWWWwK....',
    '.KWwWWWWWwWK....',
    '.KWWwWrWwWWK....',
    '.KWWWrRrWWWK....',
    '.KWWrRRRrWWK....',
    '.KWWKrRrKWWK....',
    '.KWWWKrKWWWK....',
    '.KwWWWKWWWwK....',
    '.KWwwwwwwwWK....',
    '.KKKKKKKKKKK....',
    '................'
  ],

  // 아르바이트를 하다 — a till with a coin over it. The earlier screen-on-a-desk
  // read as a home computer, which is not what an 아르바이트 looks like.
  part_time_job: [
    '...........KmK..',
    '..........KmMmK.',
    '...........KmK..',
    '....KKKKKKKK....',
    '...KWddddddWK...',
    '...KdKKKKKKdK...',
    '...KdKBBBBKdK...',
    '...KdKBggBKdK...',
    '...KdKKKKKKdK...',
    '..KKKKKKKKKKKK..',
    '..KdWWWWWWWWdK..',
    '..KdWKWKWKWKdK..',
    '..KdWWWWWWWWdK..',
    '..KdWKWKWKWKdK..',
    '..KsSSSSSSSSSsK.',
    '..KzzzzzzzzzzzK.'
  ],

  // 한국 전통 음악을 듣다 — a 북, the barrel drum, with notes rising off it. A
  // twelve-string 가야금 at 16px read as a radiator grille.
  traditional_music: [
    '.............KmK',
    '............KmMK',
    '.............Km.',
    '...KKKKKKKKK.m..',
    '..KWWWWWWWWWK...',
    '.KsWWWWWWWWWsK..',
    '.KzsSSSSSSSszK..',
    '.KzSSSSSSSSSzK..',
    '.KzSSzzzzzSSzK..',
    '.KzSSSSSSSSSzK..',
    '.KzsSSSSSSSszK..',
    '.KsWWWWWWWWWsK..',
    '..KWWWWWWWWWK...',
    '...KKKKKKKKK....',
    '...KzK...KzK....',
    '...KzK...KzK....'
  ],

  // 불고기를 만들다 — a grill pan of marbled beef over heat.
  make_bulgogi: [
    '................',
    '.....KWK..KWK...',
    '....KWWWKKWWK...',
    '.....KWK..KWK...',
    '..KKKKKKKKKKKK..',
    '.KBBBBBBBBBBBBK.',
    '.KBRrRBRrRBRrBK.',
    '.KBrRRrBrRRrBRK.',
    '.KBRrRBRrRBRrBK.',
    '.KBBBBBBBBBBBBK.',
    '..KKKKKKKKKKKK..',
    '...KmMmKKmMmK...',
    '....KmK..KmK....',
    '..KzK........KzK',
    '..KzKKKKKKKKKKzK',
    '...KzzzzzzzzzzK.'
  ]
};

// Every matrix has to be a clean 16x16 or the SVG viewBox lies about its own
// contents and the icon renders off-centre. Cheap to assert, annoying to debug.
function workbookArtSize(key) {
  const m = WORKBOOK_ART[key];
  if (!m) return null;
  const h = m.length;
  const w = m.reduce((max, row) => Math.max(max, row.length), 0);
  const ragged = m.filter((row) => row.length !== w).length;
  return { w, h, ragged };
}

function workbookArtKeys() {
  return Object.keys(WORKBOOK_ART);
}

// One <rect> per opaque pixel. Runs of the same colour on a row are merged into
// a single rect, which cuts a 16x16 icon from ~200 nodes to a few dozen — worth
// it when six of them are on screen at once.
function workbookIconSvg(key, px) {
  const matrix = WORKBOOK_ART[key];
  if (!matrix) return '';
  const size = px || 4;
  const w = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  const h = matrix.length;
  let rects = '';
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const col = WORKBOOK_ART_PALETTE[ch];
      if (!col) { x++; continue; }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      rects += '<rect x="' + x + '" y="' + y + '" width="' + run + '" height="1" fill="' + col + '"/>';
      x += run;
    }
  });
  return '<svg class="wb-art" width="' + (w * size) + '" height="' + (h * size) + '"'
    + ' viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges"'
    + ' aria-hidden="true" focusable="false">' + rects + '</svg>';
}

if (typeof window !== 'undefined') {
  window.WORKBOOK_ART = WORKBOOK_ART;
  window.WORKBOOK_ART_PALETTE = WORKBOOK_ART_PALETTE;
  window.workbookIconSvg = workbookIconSvg;
  window.workbookArtKeys = workbookArtKeys;
  window.workbookArtSize = workbookArtSize;
}
