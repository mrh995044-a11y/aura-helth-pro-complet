'use strict';
const http = require('node:http');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REQUESTS_PER_HOUR = 10;
const WINDOW_MS = 60 * 60 * 1000;
const MODEL = 'gemini-2.5-flash';
const SYSTEM = 'You are a cautious wellness assistant, not a doctor. Do not diagnose or prescribe. Encourage professional medical advice and urgent care for emergencies.';

function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function validateContents(contents) {
  if (!Array.isArray(contents) || contents.length !== 1 || contents[0]?.role !== 'user') return false;
  const parts = contents[0].parts;
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 2) return false;
  if (typeof parts[0]?.text !== 'string' || !parts[0].text.trim() || parts[0].text.length > 30000) return false;
  if (parts.length === 2) {
    const image = parts[1]?.inline_data;
    if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mime_type) || typeof image.data !== 'string' || image.data.length > 1800000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) return false;
  }
  return true;
}

function createServer({ verifyToken, apiKey, allowedUids = [], fetchImpl = fetch, now = Date.now }) {
  const allowed = new Set(allowedUids);
  const usage = new Map();
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') return reply(res, 200, { ok: true });
    if (req.method !== 'POST' || req.url !== '/api/coach') return reply(res, 404, { error: 'Not found' });
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) return reply(res, 401, { error: 'Sign in required' });
    let user;
    try { user = await verifyToken(match[1]); }
    catch { return reply(res, 401, { error: 'Invalid or expired sign-in' }); }
    if (!user.uid || user.email_verified !== true) return reply(res, 403, { error: 'A verified email is required' });
    if (!allowed.has(user.uid)) return reply(res, 403, { error: 'This account is not enabled for the AI test' });
    const time = now();
    for (const [id, window] of usage) if (time >= window.reset) usage.delete(id);
    const window = usage.get(user.uid) || { count: 0, reset: time + WINDOW_MS };
    if (window.count >= MAX_REQUESTS_PER_HOUR) return reply(res, 429, { error: 'AI request limit reached. Please try again later.' });
    window.count++; usage.set(user.uid, window);
    if (!apiKey) return reply(res, 503, { error: 'AI service is not configured' });
    let body;
    try { body = await parseBody(req); }
    catch (err) { if (!res.destroyed) reply(res, err.status || 400, { error: 'Invalid request' }); return; }
    if (!validateContents(body?.contents)) return reply(res, 400, { error: 'Invalid request contents' });
    try {
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: body.contents, systemInstruction: { parts: [{ text: SYSTEM }] }, generationConfig: { temperature: 0.4, maxOutputTokens: 900 } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) return reply(res, 502, { error: 'AI service unavailable. Please try again later.' });
      const data = await response.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) return reply(res, 502, { error: 'No AI response was available.' });
      return reply(res, 200, { text, model: MODEL });
    } catch { return reply(res, 502, { error: 'AI service unavailable. Please try again later.' }); }
  });
}

if (require.main === module) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const allowedUids = (process.env.AI_ALLOWED_UIDS || '').split(',').map(uid => uid.trim()).filter(Boolean);
  if (!projectId || !process.env.GEMINI_API_KEY || !allowedUids.length) throw new Error('Set FIREBASE_PROJECT_ID, GEMINI_API_KEY and AI_ALLOWED_UIDS in server environment');
  if (!getApps().length) initializeApp({ projectId });
  const server = createServer({ apiKey: process.env.GEMINI_API_KEY, allowedUids, verifyToken: token => getAuth().verifyIdToken(token) });
  server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('AI service listening'));
}
module.exports = { createServer, validateContents };
