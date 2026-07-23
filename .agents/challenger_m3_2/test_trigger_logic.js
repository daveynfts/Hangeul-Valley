const assert = require('assert');

// Mock Phaser / game environment for empirical verification of playPlayerAction and _updateCatNPC logic
class MockPlayer {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.active = true;
        this.depth = 5;
        this.flipX = false;
        this.velocity = { x: 0, y: 0 };
        this.currentAnim = null;
        this.texture = 'player_idle';
        this.listeners = {};
    }
    setVelocity(vx, vy) {
        this.velocity.x = vx;
        this.velocity.y = vy;
    }
    setFlipX(val) {
        this.flipX = val;
    }
    setTexture(tex) {
        this.texture = tex;
    }
    anims = {
        play: (key, flag) => {
            this.currentAnim = key;
        },
        stop: () => {
            this.currentAnim = null;
        }
    };
    once(evt, fn) {
        this.listeners[evt] = fn;
    }
    emit(evt) {
        if (this.listeners[evt]) {
            const fn = this.listeners[evt];
            delete this.listeners[evt];
            fn();
        }
    }
}

class MockCatSprite {
    constructor() {
        this.flipX = false;
        this.currentAnim = null;
    }
    setFlipX(val) {
        this.flipX = val;
    }
    play(anim, loop) {
        this.currentAnim = anim;
    }
}

// Global playerLocked variable emulation
global.playerLocked = false;
global.catDialogOpen = false;

// Mock Scene class matching game.js methods
class MockScene {
    constructor() {
        this.player = new MockPlayer();
        this.isPerformingAction = false;
        this.catSprite = new MockCatSprite();
        this.catX = 500;
        this.catY = 500;
        this.catIsMoving = false;
        this.catIdleTimer = 0;
        this.catCurrentAnim = null;
        this.anims = {
            exists: (key) => true
        };
        this.textures = {
            exists: (key) => true
        };
        this.add = {
            image: (x, y, key) => ({
                setDepth: (d) => ({
                    destroy: () => {}
                })
            })
        };
        this.time = {
            delayedCall: (delay, fn) => {
                // simulate delayedCall timer storage
                this.delayedFn = fn;
                return { remove: () => {} };
            }
        };
    }

    // Copy exact playPlayerAction method logic from game.js
    playPlayerAction(actionType, targetX, targetY, callback) {
        if (!this.player) { if (callback) callback(); return; }

        this.isPerformingAction = true;
        playerLocked = true;
        this.player.setVelocity(0, 0);

        if (typeof targetX === 'number' && typeof targetY === 'number') {
            const dx = targetX - this.player.x;
            const dy = targetY - this.player.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
                this.player.setFlipX(dx < 0);
            } else {
                this.player.setFlipX(false);
            }
        }

        const animKey = `player-${actionType}`;
        const toolKey = actionType === 'water' ? 'tool_watering_can' :
                        actionType === 'harvest' ? 'tool_sickle' :
                        actionType === 'pick' ? 'tool_basket' : null;

        let toolSprite = null;
        if (toolKey && this.textures && this.textures.exists(toolKey)) {
            const offsetX = this.player.flipX ? -12 : 12;
            toolSprite = this.add.image(this.player.x + offsetX, this.player.y - 6, toolKey)
                .setDepth(this.player.depth + 1);
        }

        let cleanedUp = false;
        const restoreState = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            if (toolSprite) { toolSprite.destroy(); toolSprite = null; }
            this.isPerformingAction = false;
            playerLocked = false;
            if (this.player && this.player.active) {
                this.player.anims.stop();
                this.player.setTexture('player_walk_down_0');
            }
            if (typeof callback === 'function') callback();
        };

        const duration = 650;
        if (this.anims && this.anims.exists(animKey)) {
            this.player.anims.play(animKey, true);
            this.player.once(`animationcomplete-${animKey}`, restoreState);
            this.time.delayedCall(duration + 100, restoreState);
        }
    }

    // Copy exact _updateCatNPC method logic from game.js
    _updateCatNPC(dt) {
        if (!this.catSprite || !this.player) return;

        const dist = Math.hypot(this.player.x - this.catX, this.player.y - this.catY);
        let targetAnim = 'cat-idle';
        const isCatTalking = typeof catDialogOpen !== 'undefined' && catDialogOpen;

        if (this.catIsMoving) {
            targetAnim = 'cat-walk';
        } else if (isCatTalking || dist < 80) {
            targetAnim = 'cat-sit';
            this.catSprite.setFlipX(this.player.x < this.catX);
            this.catIdleTimer = 0;
        } else if (dist > 250) {
            this.catIdleTimer = (this.catIdleTimer || 0) + (dt || 16);
            if (this.catIdleTimer > 5000) {
                targetAnim = 'cat-sleep';
            } else {
                targetAnim = 'cat-idle';
            }
        } else {
            this.catIdleTimer = 0;
            this.catSprite.setFlipX(this.player.x < this.catX);
            targetAnim = 'cat-idle';
        }

        if (this.catCurrentAnim !== targetAnim) {
            this.catCurrentAnim = targetAnim;
            if (this.anims && this.anims.exists(targetAnim)) {
                this.catSprite.play(targetAnim, true);
            }
        }
    }
}

// TEST SUITE
console.log('--- EMPIRICAL TEST: playPlayerAction ---');
const scene = new MockScene();
let callbackCalled = false;

assert.strictEqual(global.playerLocked, false);
assert.strictEqual(scene.isPerformingAction, false);

// Trigger action
scene.playPlayerAction('water', 150, 100, () => {
    callbackCalled = true;
});

// Verify movement lock set
assert.strictEqual(global.playerLocked, true, 'playerLocked should be true during action');
assert.strictEqual(scene.isPerformingAction, true, 'isPerformingAction should be true during action');
assert.strictEqual(scene.player.currentAnim, 'player-water');
console.log('✔ Action initiation locked player movement correctly');

// Simulate animation completion
scene.player.emit('animationcomplete-player-water');
assert.strictEqual(global.playerLocked, false, 'playerLocked should be released on anim complete');
assert.strictEqual(scene.isPerformingAction, false, 'isPerformingAction should be false on anim complete');
assert.strictEqual(callbackCalled, true, 'callback should be called on completion');
assert.strictEqual(scene.player.texture, 'player_walk_down_0');
console.log('✔ Action completion released movement lock and restored idle texture');


console.log('\n--- EMPIRICAL TEST: _updateCatNPC ---');

// Test 1: Distance < 80 -> cat-sit
scene.player.x = 450; scene.player.y = 500; // dist = 50 (< 80)
scene._updateCatNPC(16);
assert.strictEqual(scene.catCurrentAnim, 'cat-sit', 'Close player should trigger cat-sit');
assert.strictEqual(scene.catSprite.currentAnim, 'cat-sit');
console.log('✔ Close distance (< 80px) triggered cat-sit');

// Test 2: Cat moving -> cat-walk
scene.catIsMoving = true;
scene._updateCatNPC(16);
assert.strictEqual(scene.catCurrentAnim, 'cat-walk', 'Cat moving should trigger cat-walk');
console.log('✔ catIsMoving triggered cat-walk');
scene.catIsMoving = false;

// Test 3: Distance between 80 and 250 -> cat-idle
scene.player.x = 350; scene.player.y = 500; // dist = 150 (between 80 and 250)
scene._updateCatNPC(16);
assert.strictEqual(scene.catCurrentAnim, 'cat-idle', 'Medium distance should trigger cat-idle');
console.log('✔ Medium distance (150px) triggered cat-idle');

// Test 4: Distance > 250 for < 5000ms -> cat-idle
scene.player.x = 100; scene.player.y = 100; // dist = 565 (> 250)
scene._updateCatNPC(1000); // 1 sec elapsed
assert.strictEqual(scene.catCurrentAnim, 'cat-idle', 'Far distance < 5s should stay cat-idle');
console.log('✔ Far distance (< 5s) maintained cat-idle');

// Test 5: Distance > 250 for > 5000ms -> cat-sleep
scene._updateCatNPC(4500); // cumulative 5.5s elapsed (> 5000ms)
assert.strictEqual(scene.catCurrentAnim, 'cat-sleep', 'Far distance > 5s should trigger cat-sleep');
assert.strictEqual(scene.catSprite.currentAnim, 'cat-sleep');
console.log('✔ Far distance (> 5s) triggered cat-sleep');

// Test 6: Player returns close (< 80) -> back to cat-sit
scene.player.x = 490; scene.player.y = 500; // dist = 10 (< 80)
scene._updateCatNPC(16);
assert.strictEqual(scene.catCurrentAnim, 'cat-sit', 'Returning close should wake cat up to cat-sit');
console.log('✔ Returning close woke cat up to cat-sit');

console.log('\nALL TRIGGER LOGIC VERIFICATION TESTS PASSED SUCCESSFULLY!');
