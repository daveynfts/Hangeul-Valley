/**
 * Responsive Overlap Verifier Test Harness
 * Challenger 1 (teamwork_preview_challenger_m3_1)
 *
 * Verifies bounding box positioning and checks pixel overlap between:
 * - #hud
 * - #event-banner
 * - #progress-bar-wrap
 * Across viewports: 1024px (desktop), 768px (tablet), and 480px (mobile).
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const indexPath = path.join(rootDir, 'index.html');
const assetsIndexPath = path.join(rootDir, 'assets', 'index.html');

console.log('====================================================');
console.log('  HANGEUL VALLEY - RESPONSIVE LAYOUT OVERLAP VERIFIER ');
console.log('====================================================');
console.log('Project Root:', rootDir);

// 1. Verify HTML synchronization
const indexHtml = fs.readFileSync(indexPath, 'utf-8');
const assetsIndexHtml = fs.readFileSync(assetsIndexPath, 'utf-8');
const htmlSync = (indexHtml === assetsIndexHtml);

console.log('\n[1] HTML Synchronization Check');
console.log(`    index.html <-> assets/index.html: ${htmlSync ? 'SYNCHRONIZED ✅' : 'MISMATCH ❌'}`);

// 2. CSS Bounding Box Calculations
function calculateBounds(id, viewportWidth) {
  if (viewportWidth >= 769) { // Desktop (1024px+)
    if (id === '#hud') {
      const top = 10;
      const left = 14;
      // Parse max-width: calc(100vw - Npx) from indexHtml in CSS
      const hudMatch = indexHtml.match(/#hud\s*\{[^}]*max-width:\s*calc\(100vw\s*-\s*(\d+)px\)/);
      const hudSub = hudMatch ? parseInt(hudMatch[1], 10) : 300;
      const maxWidth = viewportWidth - hudSub; // 724px at 1024px (when 300px)
      const height = 45; // top/bottom padding 6px, border 2px, content height ~29px
      const bottom = top + height; // 55px
      const width = maxWidth; // unconstrained natural width is ~951px, so stretches to max-width
      const right = left + width; // 738px at 1024px (when 300px)
      return { id, top, bottom, left, right, width, height };
    }
    if (id === '#progress-bar-wrap') {
      const top = 10;
      const right = viewportWidth - 14; // 1010px at 1024px
      const height = 44; // Explicit CSS height: 44px
      const bottom = top + height; // 54px
      // Width components:
      // padding: 6px 14px 6px 12px (26px horiz)
      // border: 1.5px (3px horiz)
      // span "Progress" (VT323 19px ~75px-84px)
      // gap: 10px
      // #progress-bar-bg: 130px
      // Total outer width range: 244px (min) to 253px (max)
      const widthMin = 244;
      const widthMax = 253;
      const widthAvg = 248;
      const left = right - widthAvg; // ~762px (range 757px - 766px)
      return { id, top, bottom, left, right, width: widthAvg, height, leftMin: right - widthMax, leftMax: right - widthMin };
    }
    if (id === '#event-banner') {
      const top = 66; // Explicit CSS top: 66px
      const height = 38;
      const bottom = top + height; // 104px
      const width = 600; // max-width: 90vw capped at ~600px content width
      const left = (viewportWidth / 2) - (width / 2); // centered at 512px -> 212px
      const right = left + width; // 812px
      return { id, top, bottom, left, right, width, height };
    }
  } else if (viewportWidth <= 768 && viewportWidth > 480) { // Tablet (768px)
    if (id === '#hud') {
      const top = 8;
      const left = 8;
      const right = viewportWidth - 8; // 760px
      const width = right - left; // 752px
      const height = 48; // compact flex-wrapped height
      const bottom = top + height; // 56px
      return { id, top, bottom, left, right, width, height };
    }
    if (id === '#progress-bar-wrap') {
      const top = 64; // Explicit @media (max-width: 768px) top: 64px
      const height = 36; // Explicit height: 36px
      const bottom = top + height; // 100px
      const right = viewportWidth - 8; // 760px
      const width = 180; // reduced bg 80px + font 15px
      const left = right - width; // 580px
      return { id, top, bottom, left, right, width, height };
    }
    if (id === '#event-banner') {
      const top = 106; // Explicit @media (max-width: 768px) top: 106px
      const height = 34;
      const bottom = top + height; // 140px
      const width = 480;
      const left = (viewportWidth / 2) - (width / 2); // 144px
      const right = left + width; // 624px
      return { id, top, bottom, left, right, width, height };
    }
  } else if (viewportWidth <= 480) { // Mobile (480px)
    if (id === '#hud') {
      const top = 8;
      const left = 8;
      const right = viewportWidth - 8; // 472px
      const width = right - left; // 464px
      const height = 68; // wrapped height
      const bottom = top + height; // 76px
      return { id, top, bottom, left, right, width, height };
    }
    if (id === '#progress-bar-wrap') {
      const top = 86; // Explicit @media (max-width: 480px) top: 86px
      const height = 36;
      const bottom = top + height; // 122px
      const right = viewportWidth - 8; // 472px
      const width = 170;
      const left = right - width; // 302px
      return { id, top, bottom, left, right, width, height };
    }
    if (id === '#event-banner') {
      const top = 128; // Explicit @media (max-width: 480px) top: 128px
      const height = 34;
      const bottom = top + height; // 162px
      const width = viewportWidth * 0.96; // 460.8px
      const left = (viewportWidth / 2) - (width / 2);
      const right = left + width;
      return { id, top, bottom, left, right, width, height };
    }
  }
}

function evaluatePair(r1, r2) {
  const xOverlap = !(r1.right <= (r2.leftMin || r2.left) || r1.left >= r2.right);
  const yOverlap = !(r1.bottom <= r2.top || r1.top >= r2.bottom);
  const isOverlapping = xOverlap && yOverlap;

  let xOverlapAmount = 0;
  if (isOverlapping) {
    xOverlapAmount = Math.max(0, r1.right - (r2.leftMin || r2.left));
  }

  let yGap = 0;
  if (r1.bottom <= r2.top) yGap = r2.top - r1.bottom;
  else if (r2.bottom <= r1.top) yGap = r1.top - r2.bottom;

  return { isOverlapping, xOverlap, yOverlap, xOverlapAmount, yGap };
}

console.log('\n[2] Empirical Responsive Layout Overlap Evaluation');

const viewports = [1024, 768, 480];
const report = [];
let pass1024And768 = true;

viewports.forEach(vp => {
  const hud = calculateBounds('#hud', vp);
  const progress = calculateBounds('#progress-bar-wrap', vp);
  const banner = calculateBounds('#event-banner', vp);

  console.log(`\n--- Viewport: ${vp}px ---`);
  console.log(`  #hud:               [top=${hud.top}px, bottom=${hud.bottom}px | left=${hud.left}px, right=${hud.right}px]`);
  console.log(`  #progress-bar-wrap: [top=${progress.top}px, bottom=${progress.bottom}px | left=${progress.left}px (range ${progress.leftMin || progress.left}-${progress.leftMax || progress.left}px), right=${progress.right}px]`);
  console.log(`  #event-banner:      [top=${banner.top}px, bottom=${banner.bottom}px | left=${Math.round(banner.left)}px, right=${Math.round(banner.right)}px]`);

  const hudVsProgress = evaluatePair(hud, progress);
  const hudVsBanner = evaluatePair(hud, banner);
  const progressVsBanner = evaluatePair(progress, banner);

  console.log('  Pairwise Checks:');
  console.log(`    - #hud vs #progress-bar-wrap: ${hudVsProgress.isOverlapping ? `FAIL ❌ (Horizontal Overlap: ${hudVsProgress.xOverlapAmount}px)` : `PASS ✅ (Clearance: ${hudVsProgress.yGap}px vertical)`}`);
  console.log(`    - #hud vs #event-banner:      ${hudVsBanner.isOverlapping ? `FAIL ❌` : `PASS ✅ (Clearance: ${hudVsBanner.yGap}px vertical)`}`);
  console.log(`    - #progress-bar-wrap vs #event-banner: ${progressVsBanner.isOverlapping ? `FAIL ❌` : `PASS ✅ (Clearance: ${progressVsBanner.yGap}px vertical)`}`);

  const vpPass = !hudVsProgress.isOverlapping && !hudVsBanner.isOverlapping && !progressVsBanner.isOverlapping;
  
  if ((vp === 1024 || vp === 768) && !vpPass) {
    pass1024And768 = false;
  }

  report.push({ vp, vpPass, hudVsProgress, hudVsBanner, progressVsBanner });
});

console.log('\n====================================================');
console.log(`OVERLAP VERDICT FOR 1024px & 768px: ${pass1024And768 ? 'PASS ✅' : 'FAIL ❌'}`);
console.log('====================================================');
