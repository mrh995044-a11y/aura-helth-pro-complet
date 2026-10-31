/**
 * AuraHealth Pro — Gemini proxy
 *
 * The mobile app never ships a Gemini key. Set GEMINI_API_KEY on the server
 * and point Profile → AI connection → Secure proxy at this route.
 *
 *   POST /api/coach
 *   Body: { model, contents, systemInstruction, generationConfig }
 *   Response: { text, model } or { error }
 *
 * Deploy on Vercel (this file is a serverless function), Cloud Functions,
 * or any Node host. Do not log request bodies — they may contain health notes.
 */

const DEFAULT_MODEL = 'gemini-2.5-flash';

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' });
    return;
  }

  const body = readBody(req);
  const model = String(body.model || DEFAULT_MODEL).replace(/[^a-zA-Z0-9._-]/g, '');
  if (!body.contents) {
    res.status(400).json({ error: 'contents is required' });
    return;
  }

  const upstream = {
    contents: body.contents,
    systemInstruction: body.systemInstruction,
    generationConfig: body.generationConfig || { temperature: 0.4, maxOutputTokens: 900 },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const gemini = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(upstream),
    });
    const data = await gemini.json();
    if (!gemini.ok) {
      const message = data?.error?.message || `Gemini HTTP ${gemini.status}`;
      res.status(gemini.status).json({ error: message });
      return;
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (!text) {
      res.status(502).json({ error: data.promptFeedback?.blockReason || 'Empty Gemini reply' });
      return;
    }
    res.status(200).json({ text, model });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Upstream failure' });
  }
};
