// The old public Vercel proxy was unauthenticated. Do not deploy it with a key.
// The Render service in ../server.js requires verified Firebase ID tokens.
module.exports = function (_req, res) {
  res.status(410).json({ error: 'This endpoint is disabled. Use the authenticated AI service.' });
};
