const { env, setCors } = require('./_r2');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    googleClientId: env('GOOGLE_CLIENT_ID'),
    cloudSave: !!(env('R2_ACCOUNT_ID') && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY'))
  });
};
