'use strict';

const path = require('path');

function repoRoot() {
  return path.join(__dirname, '..');
}

function refuseWrite(res) {
  res.status(409).json({
    success: false,
    error: 'Conflict',
    details: 'Admin is read-only on Vercel. To edit files, run `cd admin && npm start` on your machine.'
  });
}

function handleGet(req, res, fn) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    refuseWrite(res);
    return;
  }
  try {
    const body = fn();
    res.status(200).json(body);
  } catch (err) {
    const status = err.status || (/not found/i.test(err.message) ? 404 : 500);
    res.status(status).json({
      success: false,
      error: err.name || 'Error',
      details: err.message
    });
  }
}

module.exports = { repoRoot, refuseWrite, handleGet };
