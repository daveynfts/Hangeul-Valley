/**
 * One-button prod publish: validate → R2 upload → verify → Vercel deploy hook.
 *
 * Content (sprites / worlds / curriculum JSON) is served from R2 via vercel.json
 * rewrites. Runtime (js/*, index.html, api/) deploys on Vercel. Uploading first
 * then triggering Vercel avoids the old "new JS, old CDN" window.
 *
 *   npm run publish:prod
 *   node scripts/publish.js --dry-run
 */
'use strict';

const { runPublish } = require('./r2Content');

if (require.main === module) {
  runPublish(process.argv.slice(2)).catch((err) => {
    console.error('PUBLISH_FAIL', err && err.name, err && err.message);
    process.exit(1);
  });
}
