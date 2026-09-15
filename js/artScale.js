// ═══════════════ HOW EACH ART IMAGE IS RESAMPLED ═════════════════════════════
// Every art <img> in the interface carries `image-rendering: pixelated` from the stylesheet,
// which is the correct instruction for exactly one case: painting a tile at a whole-number
// multiple of its own pixels. Chrome reads it as nearest-neighbour in *both* directions, so
// the declaration that keeps a 48px farm tile crisp at 4x is the same one that tells the
// browser to drop three of every four pixels when a 192px illustration is shown in a 96px
// box, and to duplicate some rows but not others at 1.5x. A 2px checkerboard shows it
// plainly: at 0.5x `crisp-edges` returns harsh aliasing where `auto` returns the average.
//
// One declaration cannot be right for all of it any more. The artwork spans three source
// generations — 48px farm tiles, 96px TOPIK tiles, 192px Unit illustrations — and they share
// the same boxes. So the choice is made per image, from the ratio the browser actually
// paints at.
//
// That ratio is in *device* pixels, not CSS pixels, and the difference is the whole point: a
// 96px box on a 2x phone paints a 192px illustration at 1:1, while the same box on a 1x
// desktop halves it. Reading devicePixelRatio is what lets one rule serve both.
const HV_ART_SCALE_TOLERANCE = 0.02;
const HV_ART_CLASS_RE = /(^|\s)(vocab-art-icon|wb-art|hud-art-icon|trophy-art-icon|inv-art-icon)(\s|$)/;

// The painted height, not the box height. `object-fit: contain` is on most of these boxes and
// a square box around a 306x192 illustration paints it at a third of the box's height — which
// is the number the ratio has to be computed from, or a wide image is judged by a scale it is
// never drawn at.
function hvArtPaintedHeight(boxW, boxH, natW, natH, objectFit) {
  if (!natW || !natH || !boxW || !boxH) return 0;
  const fit = objectFit || 'fill';
  if (fit === 'none') return natH;
  if (fit === 'cover') return Math.max(boxW / natW, boxH / natH) * natH;
  if (fit === 'contain' || fit === 'scale-down') {
    let s = Math.min(boxW / natW, boxH / natH);
    if (fit === 'scale-down') s = Math.min(1, s);
    return s * natH;
  }
  return boxH;
}

// 'pixelated' only when the image lands on a whole multiple of its own pixels at or above 1:1
// — that is the case nearest-neighbour was meant for, and the one where it beats smoothing.
// Everything else (any reduction, any fractional enlargement) goes to the browser's own
// resampler, which averages instead of discarding. Returns '' when the answer is not yet
// knowable — an image still loading, or laid out in a hidden panel — so the caller leaves the
// stylesheet's value alone rather than guessing from a zero.
function hvArtScaleMode(naturalHeight, paintedHeight, dpr) {
  if (!naturalHeight || !paintedHeight || paintedHeight <= 0) return '';
  const ratio = (paintedHeight * (dpr > 0 ? dpr : 1)) / naturalHeight;
  if (ratio < 1 - HV_ART_SCALE_TOLERANCE) return 'auto';
  const whole = Math.round(ratio);
  return Math.abs(ratio - whole) <= HV_ART_SCALE_TOLERANCE ? 'pixelated' : 'auto';
}

// ── The same question inside the game canvas ─────────────────────────────────
// `pixelArt: true` sets every Phaser texture to NEAREST. That is right for a farm tile drawn
// at its own size and wrong for anything drawn smaller than it was made: at 0.72x nearest
// keeps about seven pixels in ten and drops the rest, so a straight edge arrives with a bite
// out of it. The filter belongs to the texture rather than to one sprite, so this is called
// at the sites that shrink — where the texture is not also drawn at full size elsewhere —
// rather than swept over the display list.
function hvFitTextureFilter(gameObject) {
  if (typeof Phaser === 'undefined' || !gameObject || !gameObject.texture) return gameObject;
  const modes = Phaser.Textures && Phaser.Textures.FilterMode;
  const frame = gameObject.frame;
  const srcW = (frame && frame.width) || 0;
  const srcH = (frame && frame.height) || 0;
  if (!modes || !srcW || !srcH) return gameObject;
  const ratio = Math.min(Math.abs(gameObject.displayWidth) / srcW,
    Math.abs(gameObject.displayHeight) / srcH);
  gameObject.texture.setFilter(ratio < 1 - HV_ART_SCALE_TOLERANCE ? modes.LINEAR : modes.NEAREST);
  return gameObject;
}

// Filtering alone does not rescue a large reduction. Holding a 192px illustration to a
// pickup's 48px footprint is a quarter-scale draw, and bilinear reads a 2x2 neighbourhood —
// at that ratio it is nearest with extra steps. Mipmaps would be the answer and WebGL1
// refuses them here, because the sources are not powers of two. A canvas can do it properly,
// once, at load:
// 2D `imageSmoothingQuality: "high"` is a real area resample. The reduction is registered as
// its own texture and then drawn at 1:1, so nothing downstream has to know.
function hvDownsampledTexture(scene, key, targetHeight) {
  if (!scene || !scene.textures || !key || !targetHeight) return key;
  if (!scene.textures.exists(key)) return key;
  const out = key + '@' + targetHeight;
  if (scene.textures.exists(out)) return out;
  const src = scene.textures.get(key).getSourceImage();
  if (!src || !src.width || !src.height || src.height <= targetHeight) return key;
  const width = Math.max(1, Math.round(src.width * targetHeight / src.height));
  const canvasTexture = scene.textures.createCanvas(out, width, targetHeight);
  if (!canvasTexture) return key;
  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, width, targetHeight);
  canvasTexture.refresh();
  return out;
}

function hvIsArtImage(img) {
  if (!img || img.tagName !== 'IMG') return false;
  const cls = typeof img.className === 'string' ? img.className : '';
  if (HV_ART_CLASS_RE.test(cls)) return true;
  return /(^|\/)sprites\//.test(img.getAttribute('src') || '');
}

// Feature-detected rather than merely guarded on `typeof document`: the test harnesses build a
// small stand-in document with the handful of methods the code under test needs, and a module
// that assumes a whole browser the moment a `document` exists takes those harnesses down with
// it. Nothing below is required for the game to run — without it the stylesheet's own
// `image-rendering` stands, which is where this started.
if (typeof document !== 'undefined' && typeof window !== 'undefined'
    && typeof document.addEventListener === 'function'
    && typeof window.addEventListener === 'function'
    && typeof window.getComputedStyle === 'function') {
  const hvArtImages = new Set();

  const hvTuneArtImage = (img) => {
    if (!img || !img.naturalHeight) return;
    const box = img.getBoundingClientRect();
    const cs = window.getComputedStyle(img);
    const painted = hvArtPaintedHeight(box.width, box.height,
      img.naturalWidth, img.naturalHeight, cs.objectFit);
    const mode = hvArtScaleMode(img.naturalHeight, painted, window.devicePixelRatio);
    if (!mode) return;
    // Only ever written when it changes: assigning the same value still invalidates the
    // element's style and this runs from a ResizeObserver, where a needless write per frame
    // is a needless relayout per frame.
    if (img.style.imageRendering !== mode) img.style.imageRendering = mode;
  };

  // A box can change without the window changing — a media query flipping, a panel opening, a
  // grid reflowing around it — and each of those changes the ratio. The observer also fires
  // once on observe(), which covers the ordinary case of an image that loaded while its panel
  // was still display:none and had no box to measure yet.
  const hvArtObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver((entries) => entries.forEach((e) => hvTuneArtImage(e.target)))
    : null;

  const hvRegisterArtImage = (img) => {
    if (!hvIsArtImage(img) || hvArtImages.has(img)) return;
    hvArtImages.add(img);
    if (hvArtObserver) { try { hvArtObserver.observe(img); } catch (e) { /* detached */ } }
    hvTuneArtImage(img);
  };

  // load does not bubble, but it is dispatched through the capture phase, so one listener on
  // the document catches every art image the interface will ever build — including the ones
  // written with innerHTML, which is how nearly all of them arrive.
  document.addEventListener('load', (e) => hvRegisterArtImage(e.target), true);

  // devicePixelRatio changes when the window moves to another monitor, and that changes every
  // answer without changing a single box, so the observer never hears about it.
  window.addEventListener('resize', () => {
    hvArtImages.forEach((img) => {
      if (!img.isConnected) {
        hvArtImages.delete(img);
        if (hvArtObserver) { try { hvArtObserver.unobserve(img); } catch (e) { /* gone */ } }
        return;
      }
      hvTuneArtImage(img);
    });
  });

  const hvSweepArtImages = () => {
    if (typeof document.querySelectorAll !== 'function') return;
    Array.prototype.forEach.call(document.querySelectorAll('img'), (img) => {
      if (img.complete && img.naturalHeight) hvRegisterArtImage(img);
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hvSweepArtImages);
  } else {
    hvSweepArtImages();
  }

  window.hvTuneArtImage = hvTuneArtImage;
  window.hvRegisterArtImage = hvRegisterArtImage;
  window.hvArtScaleMode = hvArtScaleMode;
  window.hvFitTextureFilter = hvFitTextureFilter;
  window.hvDownsampledTexture = hvDownsampledTexture;
  window.hvArtPaintedHeight = hvArtPaintedHeight;
}
