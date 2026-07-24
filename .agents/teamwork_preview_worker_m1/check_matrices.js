const P = {
  '.': null,
  'K': 0x1A1A2E, 'k': 0x24243B,
  '1': 0xFFF3E8, 'X': 0xFFE0C2, 'O': 0xFFE0C2, 'x': 0xF1B78B, 'i': 0xD38666, 'I': 0x9C533C, 'o': 0xE07068, 'N': 0x121016, 'W': 0xFFFFFF,
  '4': 0xB87C52, 'f': 0x8D5B3A, 'H': 0x653E23, 'h': 0x3D2314,
  '5': 0xFFF5B8, 't': 0xF4D685, 'T': 0xDC9F42, 'V': 0xB37D2A, 'v': 0x7A5016, '6': 0x54360B, 'p': 0xEA5B4B, 'R': 0xC23B22, 'r': 0x731C13,
  '7': 0xFFFFFF, 'w': 0xF2ECE1, 'F': 0xD5CFBF, 'g': 0x999385,
  '8': 0x7EA5D9, 'z': 0x4B6B94, 'Z': 0x334B73, 'q': 0x213252, 'Q': 0x141E36, 'J': 0x1D283B, 'b': 0xE6B830, '9': 0xB3881B, 'B': 0x60A5FA, '2': 0x1E3A8A,
  'L': 0x854B27, 'S': 0x5E3218, 's': 0x3B1F0E, '0': 0x0B090C, '3': 0xD49B5B,
  'n': 0x78350F, 'e': 0x59381E, 'E': 0x78350F, 'M': 0x64748B, 'd': 0x475569, 'm': 0x94A3B8, 'c': 0x94A3B8, 'C': 0xE2E8F0, 'U': 0x38BDF8, 'u': 0x6BB1D6,
  'G': 0x22C55E, 'A': 0xEF4444, 'a': 0xFCA5A5, 'D': 0x7F1D1D, 'j': 0x78350F, 'Y': 0xFDE047, 'y': 0xEAB308
};

const down_0 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5tTTt5VvKK.',
  '..KKrRpRRpRrKK..',
  '..KKf4fHHf4fKK..',
  '...K1XNWXNWX1K..',
  '...KXxXooXiXK...',
  '...KKXiXXIXKKKK.',
  '..KKgFz8b9bzFgKK',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const down_1 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5tTTt5VvKK.',
  '..KKrRpRRpRrKK..',
  '..KKf4fHHf4fKK..',
  '...K1XNWXNWX1K..',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '.KKgFz8b9bzFgXKK',
  '.KKgFBzZZzBFgXKK',
  '..KKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZZKKKKKKZZQK.',
  '.KQ22KKKKKKQ2QK.',
  '.K0s3LSKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];

const down_2 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5tTTt5VvKK.',
  '..KKrRpRRpRrKK..',
  '..KKf4fHHf4fKK..',
  '...K1XNWXNWX1K..',
  '...KXxXooXiXK...',
  '.KKKKXiXXIXKKK..',
  'KKXgFz8b9bzFgKK.',
  'KKXgFzZZzBFgKKK.',
  '.KKKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZQKKKKKKZZQK.',
  '.KQZQKKKKKK22QK.',
  'K0s3LSKKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];

const up_0 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5tTTt5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKh4HH4hKK...',
  '...KhH4HHHH4hK..',
  '...KhHHHHHHhK...',
  '...KKhxiixhKKKK.',
  '..KKgFz8888zFgKK',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const up_1 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5tTTt5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKh4HH4hKK...',
  '...KhH4HHHH4hK..',
  '...KhHHHHHHhK...',
  '..KKKhxiixhKKKK.',
  '.KKgFz8888zFgXKK',
  '.KKgFBzZZzBFgXKK',
  '..KKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZZKKKKKKZZQK.',
  '.KQ22KKKKKKQ2QK.',
  '.K0s3LSKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];

const up_2 = [
  '..KKKKKKKKKKKK..',
  '..KKv5tTTt5vKK..',
  '.KKvV5tTTt5VvKK.',
  '..KKrRpRRpRrKK..',
  '...KKh4HH4hKK...',
  '...KhH4HHHH4hK..',
  '...KhHHHHHHhK...',
  '.KKKKhxiixhKKK..',
  'KKXgFz8888zFgKK.',
  'KKXgFzZZzBFgKKK.',
  '.KKKqzZ2JJ2ZzqKK',
  '.KKKQzZ2222ZzQKK',
  '.KQZQKKKKKKZZQK.',
  '.KQZQKKKKKK22QK.',
  'K0s3LSKKKKK0s3LS',
  '.KKKKKKKKKKKKKK.'
];

const left_0 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKf4HhKK....',
  '..KKO1NWf4HhKK..',
  '..KKXOoXihhKK...',
  '...KKXiIihKKK...',
  '...KKgFz8bZqKK..',
  '..KKXgFZZZqXKK..',
  '...KKKqZZZZqKK..',
  '....KKQZZZZQK...',
  '....KKQZZZZQK...',
  '....KKQZZZZQKK..',
  '....KK0s3LS0s3LS',
  '....KKKKKKKKKK..'
];

const left_1 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKf4HhKK....',
  '..KKO1NWf4HhKK..',
  '..KKXOoXihhKK...',
  '...KKXiIihKKK...',
  '.KKKXgFz8bZqKK..',
  'KKXgFzZZZqKKK...',
  '.KKKKqZZZZqKKKK.',
  '..KKKqZZZKKZZqK.',
  '.KKQZZKKKKKZZQKK',
  '.KQZZKKKKKKKZZQK',
  '.K0s3LSKKKK0s3LS',
  '.KKKKKKKKKKKKKKK'
];

const left_2 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKf4HhKK....',
  '..KKO1NWf4HhKK..',
  '..KKXOoXihhKK...',
  '...KKXiIihKKKKK.',
  '....KKgFz8bZqXKK',
  '....KKgFZZZqXKK.',
  '.....KKqZZZZqKKK',
  '...KKKqZZZKKZZqK',
  '..KKQZZKKKKKZZQK',
  '..KQZZKKKKKKKZZK',
  '..K0s3LSKKKK0s3L',
  '..KKKKKKKKKKKKKK'
];

const right_0 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKh4fKKK....',
  '..KKh4fWN1OKK...',
  '...KKhhiXoOXKK..',
  '...KKKhiIiXKK...',
  '..KKqZb8zFgKK...',
  '..KKXqZZZFgXKK..',
  '..KKqZZZZqKKK...',
  '...KQZZZZQK.....',
  '...KQZZZZQK.....',
  '...KQZZZZQK.....',
  '..KK0s3LS0s3LSKK',
  '..KKKKKKKKKK....'
];

const right_1 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKh4fKKK....',
  '..KKh4fWN1OKK...',
  '...KKhhiXoOXKK..',
  '...KKKhiIiXKK...',
  '..KKqZb8zFgXKK..',
  '...KKqZZZzFgXKK.',
  '.KKKKKqZZZZqKK..',
  '.KqZZKKZZZqKKK..',
  'KKQZZKKKKKZZQKK.',
  'KQZZKKKKKKKZZQK.',
  '0s3LSKKKKKK0s3LS',
  'KKKKKKKKKKKKKKK.'
];

const right_2 = [
  '....KKKKKKKK....',
  '...KKv5tTt5vKK..',
  '..KKvV5TtVvKK...',
  '...KKrRpRrKK....',
  '...KKKh4fKKK....',
  '..KKh4fWN1OKK...',
  '...KKhhiXoOXKK..',
  '...KKKhiIiXKK...',
  '..KKXqZb8zFgKK..',
  '...KKXqZZZFgKK..',
  '...KKKqZZZZqKK..',
  'KKKKqZZKKZZZqK..',
  'KQZZKKKKKZZQKK..',
  'KZZKKKKKKKZZQK..',
  '0s3LSKKKKKK0s3LS',
  'KKKKKKKKKKKKKK..'
];

const water_down_0 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKKK',
  '..KKgFz8b9bKnKK.',
  '..KKgFBzZZzKMmK.',
  '..KKqzZ2JJ2KdMK.',
  '..KKQzZ2222KdMK.',
  '..KQZZKKKKZZKdKK',
  '..KQ22KKKK22QKK.',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const water_down_1 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXKK..',
  '..KKKXiXXIXKKK..',
  '..KKgFz8b9bFKKK.',
  '..KKgFBzZZzBFKnK',
  '..KKqzZ2JJ2ZKMmK',
  '..KKQzZ2222KdUK.',
  '..KQZZKKKKZZKdWK',
  '..KQ22KKKK22QKUK',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const water_down_2 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXKK..',
  '..KKKXiXXIXKKK..',
  '..KKgFz8b9bFKKK.',
  '..KKgFBzZZzBFKKK',
  '..KKqzZ2JJ2ZFKnK',
  '..KKQzZ2222ZKMmK',
  '..KQZZKKKKZZKdUK',
  '..KQ22KKKKZZKdWK',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKKKK'
];

const harvest_down_0 = [
  '................',
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '.KKgFBzZZzBFgXKK',
  '.KKXqzZ2JJ2ZqXKK',
  '.KKXQzZ2222ZQKK.',
  '..KQZZKKKKZZQK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const harvest_down_1 = [
  '................',
  '................',
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '.KKgFBzGAAgZBFgK',
  'KKXqZaAaAaXZqXKK',
  'KKXQZZsDDsZZQXKK',
  '.KK0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const harvest_down_2 = [
  '..KKKKKKKKKKKK..',
  '..KKgXaAaAXgKK..',
  '...KKXsDDsXKK...',
  '..KKKKtTTtKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const pick_down_0 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXKKK.',
  '..KKKXiXXIXKKXKK',
  '..KKgFz8b9bFgXK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const pick_down_1 = [
  '..KKKKKKKKKKKKKK',
  '.KKKv5tTt5vKKXaK',
  'KKvV5TtT5VvKaK..',
  '.KKKrRpRRpRrKDKK',
  '...KKf4fHHfKgK..',
  '...K1XNWXNWXKKKK',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const pick_down_2 = [
  '..KKKKKKKKKKKK..',
  '.KKKv5tTt5vKKK..',
  'KKvV5TtT5VvKK...',
  '.KKKrRpRRpRrKKK.',
  '...KKf4fHHf4fKK.',
  '...K1XNWXNWXK...',
  '...KXxXooXiXK...',
  '..KKKXiXXIXKKKK.',
  '..KKgFz8b9bFgKK.',
  '..KKgFBzZZzBFgKK',
  '..KKqzZ2JJ2ZzqKK',
  '..KKQzZ2222ZzQKK',
  '..KQZZKKKKZZQKK.',
  '..KQ22KKKK22QK..',
  '..K0s3LSKK0s3LSK',
  '..KKKKKKKKKKKK..'
];

const tool_watering_can = [
  '................',
  '....KKKKKKKK....',
  '....KKnKKKnKK...',
  '....KKnCCCnKK...',
  '....KKnmmmnKK...',
  '...KKdMMMMMmKK..',
  '..KKdCMMMMMMmKK.',
  '..KKdMMMMMMMmKKK',
  '..KKdMMMMMMMmKnK',
  '..KKdMMMMMMMmKdK',
  '..KKdddddddddKUK',
  '...KKKKKKKKKKKWK',
  '.............KKK',
  '................',
  '................',
  '................'
];

const tool_basket = [
  '.....KKKKKK.....',
  '.....KKjjKK.....',
  '....KKjKKjKK....',
  '....KKjKKjKKK...',
  '...KKjGAAgGjKK..',
  '..KKgXaAaAXgKKK.',
  '.KKgAYsDDsYAaGKK',
  'KKjYyYyYyYyYyYjK',
  'KKjyYyYyYyYyYyjK',
  'KKjYyYyYyYyYyYjK',
  'KKjyYyYyYyYyYyjK',
  '.KKjjjjjjjjjjjKK',
  '.KKKKKKKKKKKKKKK',
  '................',
  '................',
  '................'
];

const tool_sickle = [
  '................',
  '......KKKKKK....',
  '....KKKKCCCKKK..',
  '...KKKCcMMKKK...',
  '..KKKCcMMdKK....',
  '.KKKCcMMdKK.....',
  '.KKCcMMdKK......',
  'KKKCcMMdK.......',
  'KKKCcMMdK.......',
  '.KKKcMdKK.......',
  '..KKKnnbK.......',
  '...KKKneKK......',
  '....KKKneKK.....',
  '.....KKKEKK.....',
  '......KKKK......',
  '................'
];

const matrices = {
  down_0, down_1, down_2,
  up_0, up_1, up_2,
  left_0, left_1, left_2,
  right_0, right_1, right_2,
  water_down_0, water_down_1, water_down_2,
  harvest_down_0, harvest_down_1, harvest_down_2,
  pick_down_0, pick_down_1, pick_down_2,
  tool_watering_can, tool_basket, tool_sickle
};

let totalErrors = 0;
for (const [name, mat] of Object.entries(matrices)) {
  if (mat.length !== 16) {
    console.log(`[${name}] Rows count = ${mat.length} (expected 16)`);
    totalErrors++;
  }
  mat.forEach((row, rIdx) => {
    if (row.length !== 16) {
      console.log(`[${name}] Row ${rIdx} length = ${row.length}: "${row}"`);
      totalErrors++;
    }
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      if (!(char in P)) {
        console.log(`[${name}] Row ${rIdx} Col ${c}: Unknown token '${char}'`);
        totalErrors++;
      }
    }
  });
}

if (totalErrors === 0) {
  console.log("SUCCESS: All 24 matrices are 16x16 and all tokens are defined in palette P!");
} else {
  console.log(`FAILED: ${totalErrors} errors found.`);
}
