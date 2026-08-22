'use strict';

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }
  res.status(200).json({
    success: true,
    data: {
      writable: false,
      gameUrl: '/',
      hint: 'This copy is read-only. Run `cd admin && npm start` locally to edit levels, Unit 10, or sync files.'
    }
  });
};
