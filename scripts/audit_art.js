#!/usr/bin/env node
'use strict';
const path = require('path');
const { auditArt } = require('./art_library');

const ROOT = path.resolve(__dirname, '..');
const report = auditArt(ROOT);

console.log('art audit');
console.log('  catalog', report.catalog);
console.log('  png on disk', report.disk);
console.log('  cacheKey', report.cacheKey);
if (report.missing.length) {
  console.log('  missing PNG for catalog row:');
  report.missing.forEach((p) => console.log('   -', p));
}
if (report.orphans.length) {
  console.log('  PNG on disk with no catalog row:');
  report.orphans.forEach((p) => console.log('   -', p));
}
if (report.unnamed.length) {
  console.log('  catalog row missing id/nameEn/path/kind:');
  report.unnamed.forEach((p) => console.log('   -', p));
}
if (report.badFolder.length) {
  console.log('  path not in ART_FOLDERS:');
  report.badFolder.forEach((p) => console.log('   -', p));
}
if (report.badSlug.length) {
  console.log('  filename is not snake_case:');
  report.badSlug.forEach((p) => console.log('   -', p));
}
if (report.badId.length) {
  console.log('  catalog id does not start with folder kind:');
  report.badId.forEach((p) => console.log('   -', p));
}
if (report.duplicateId.length) {
  console.log('  duplicate catalog id:');
  report.duplicateId.forEach((p) => console.log('   -', p));
}
if (report.duplicatePath.length) {
  console.log('  duplicate catalog path:');
  report.duplicatePath.forEach((p) => console.log('   -', p));
}
if (!report.ok) {
  console.error('ART_AUDIT_FAIL');
  process.exit(1);
}
console.log('art audit ok');
