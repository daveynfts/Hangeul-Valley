const fs = require('fs');
const js = fs.readFileSync('game.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

class MockElement {
    constructor(tagName, id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.classList = {
            _classes: new Set(),
            add(...cs) { cs.forEach(c => this._classes.add(c)); },
            remove(...cs) { cs.forEach(c => this._classes.delete(c)); },
            contains(c) { return this._classes.has(c); },
            toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
        };
        this.style = {};
        this.children = [];
        this.listeners = {};
        this.value = '';
        this.textContent = '';
        this.innerHTML = '';
    }
    focus() {}
    blur() {}
    addEventListener(evt, fn) {
        if (!this.listeners[evt]) this.listeners[evt] = [];
        this.listeners[evt].push(fn);
    }
    removeEventListener(evt, fn) {
        if (this.listeners[evt]) {
            this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
        }
    }
    dispatchEvent(evt) {
        if (this.listeners[evt.type]) {
            this.listeners[evt.type].forEach(fn => fn(evt));
        }
    }
    appendChild(child) {
        this.children.push(child);
    }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getContext() {
        return {
            fillRect() {}, clearRect() {}, fillStyle: '', getImageData() { return { data: new Uint8Array(100) }; }
        };
    }
}

const elementsById = {};
const idMatches = [...html.matchAll(/id=["']([^"']+)["']/g)];
idMatches.forEach(m => {
    const id = m[1];
    elementsById[id] = new MockElement('DIV', id);
});

global.window = global;
global.window.innerWidth = 1280;
global.window.innerHeight = 720;
global.window.addEventListener = (evt, fn) => {};
global.window.removeEventListener = (evt, fn) => {};

global.document = {
    body: new MockElement('BODY'),
    getElementById(id) {
        if (!elementsById[id]) {
            elementsById[id] = new MockElement('DIV', id);
        }
        return elementsById[id];
    },
    createElement(tag) {
        return new MockElement(tag);
    },
    addEventListener(evt, fn) {},
    removeEventListener(evt, fn) {}
};

global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

global.fetch = async (url) => {
    if (url === 'levels.json') {
        const levelsContent = fs.readFileSync('levels.json', 'utf8');
        return {
            ok: true,
            json: async () => JSON.parse(levelsContent)
        };
    }
    return { ok: false };
};

global.Phaser = {
    AUTO: 0,
    Scale: { RESIZE: 3, CENTER_BOTH: 1 },
    Game: class { constructor(config) { this.config = config; } },
    Scene: class { constructor(cfg) {} },
    Math: {
        Between(a, b) { return a; },
        Distance: { Between(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); } }
    },
    Utils: { Array: { GetRandom(arr) { return arr[0]; } } },
    Input: { Keyboard: { KeyCodes: { W: 87, A: 65, S: 83, D: 68, SPACE: 32, UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39 } } }
};

// Wrap code so top-level functions are tested inside
const wrapperCode = `
${js}

// EMPIRICAL FUNCTION STRESS TESTING
console.log('\\n=== TESTING ALL MODAL AND HUD FUNCTIONS INSIDE SCOPE ===');

const fnsToTest = [
    () => { openShop(); console.log('PASS: openShop()'); },
    () => { closeShop(); console.log('PASS: closeShop()'); },
    () => { showCatDialog(); console.log('PASS: showCatDialog()'); },
    () => { closeCatDialog(); console.log('PASS: closeCatDialog()'); },
    () => { openQuiz({ko:'사과', en:'apple', emoji:'🍎', category:'Fruit', funFactVi:'Fact'}, {}, 1); console.log('PASS: openQuiz()'); },
    () => { closeQuiz(); console.log('PASS: closeQuiz()'); },
    () => { showLevelSelect(); console.log('PASS: showLevelSelect()'); },
    () => { window.openSpellDuel(); console.log('PASS: openSpellDuel()'); },
    () => { window.closeSpellDuel(); console.log('PASS: closeSpellDuel()'); },
    () => { window.openMemoryGame(); console.log('PASS: openMemoryGame()'); },
    () => { window.closeMemoryGame(); console.log('PASS: closeMemoryGame()'); },
    () => { window.openTrophies(); console.log('PASS: openTrophies()'); },
    () => { window.closeTrophies(); console.log('PASS: closeTrophies()'); },
    () => { window.openFishAlbum(); console.log('PASS: openFishAlbum()'); },
    () => { window.closeFishAlbum(); console.log('PASS: closeFishAlbum()'); },
];

fnsToTest.forEach(fn => {
    try {
        fn();
    } catch(e) {
        console.error('FAIL in test:', e.stack);
    }
});
`;

console.log('=== EXECUTING FULL WRAPPER STRESS TEST ===');
try {
    eval(wrapperCode);
    console.log('\nFULL WRAPPER STRESS TEST COMPLETED!');
} catch (err) {
    console.error('ERROR during evaluation:', err);
}

// Allow time for async timeouts
setTimeout(() => {
    console.log('Async callbacks completed cleanly!');
}, 200);
