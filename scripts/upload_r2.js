/**
 * Upload Hangeul Valley static content to the shared Cloudflare R2 bucket
 * under prefix hangeul-valley/.
 *
 * Credentials: env R2_* (or --env path). Does not print secrets.
 * For the full prod path (validate → upload → verify → Vercel) use:
 *   npm run publish:prod
 */
'use strict';

const { runUpload } = require('./r2Content');

if (require.main === module) {
  runUpload(process.argv.slice(2)).catch((err) => {
    console.error('UPLOAD_FAIL', err && err.name, err && err.message);
    process.exit(1);
  });
}
