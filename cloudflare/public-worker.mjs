// AuraHealth Pro: quota-protected Cloudflare Worker. Do not log requests,
// tokens, health data, Gemini keys or upstream response bodies.
const KEYS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MODEL = 'gemini-3.5-flash-lite';
const MAX_BYTES = 2 * 1024 * 1024;
const SYSTEM = 'You are a cautious wellness assistant, not a doctor. Do not diagnose or prescribe. Encourage professional medical advice and urgent care for emergencies.';
let keysCache = null;
let keysExpiry = 0;

function response(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
function decode64(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Invalid base64url');
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0));
}
function decodeJson(s) { return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(decode64(s))); }
async function getKeys() {
  if (keysCache && Date.now() < keysExpiry) return keysCache;
  const res = await fetch(KEYS_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Key fetch failed');
  const body = await res.json();
  if (!Array.isArray(body.keys)) throw new Error('Invalid keys');
  const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(res.headers.get('cache-control') || '')?.[1] || 0);
  keysCache = body.keys;
  keysExpiry = Date.now() + Math.min(maxAge, 3600) * 1000;
  return keysCache;
}
async function verifyToken(token, projectId) {
  if (token.length > 8192) throw new Error('Invalid token');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const header = decodeJson(parts[0]);
  const claims = decodeJson(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) throw new Error('Invalid header');
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` ||
      typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
      !Number.isInteger(claims.exp) || claims.exp <= now || !Number.isInteger(claims.iat) || claims.iat > now ||
      !Number.isInteger(claims.auth_time) || claims.auth_time > now) throw new Error('Invalid claims');
  const jwk = (await getKeys()).find(key => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new Error('Unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode64(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error('Bad signature');
  return claims;
}
async function readLimited(req) {
  const size = Number(req.headers.get('content-length') || 0);
  if (!Number.isFinite(size) || size < 0 || size > MAX_BYTES) throw new Error('too large');
  if (!req.body) throw new Error('empty body');
  const reader = req.body.getReader();
  const chunks = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new Error('too large'); }
    chunks.push(value);
  }
  const all = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(all));
}
function validContents(contents) {
  if (!Array.isArray(contents) || contents.length !== 1 || contents[0]?.role !== 'user') return false;
  const parts = contents[0].parts;
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 2 || typeof parts[0]?.text !== 'string' || !parts[0].text.trim() || parts[0].text.length > 30000) return false;
  if (parts.length === 2) {
    const image = parts[1]?.inline_data;
    if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mime_type) || typeof image.data !== 'string' || image.data.length > 1800000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) return false;
  }
  return true;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return response(200, { ok: true });
    if (request.method !== 'POST' || url.pathname !== '/api/coach') return response(404, { error: 'Not found' });
    if (!env.FIREBASE_PROJECT_ID || !env.GEMINI_API_KEY || !env.AI_QUOTA) return response(503, { error: 'AI service is not configured' });
    const bearer = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '');
    if (!bearer) return response(401, { error: 'Sign in required' });
    let user;
    try { user = await verifyToken(bearer[1], env.FIREBASE_PROJECT_ID); }
    catch { return response(401, { error: 'Invalid or expired sign-in' }); }
    if (user.email_verified !== true) return response(403, { error: 'A verified email is required' });
    let body;
    try { body = await readLimited(request); } catch { return response(400, { error: 'Invalid or oversized request' }); }
    if (!validContents(body?.contents)) return response(400, { error: 'Invalid request contents' });
    try {
      const stub = env.AI_QUOTA.get(env.AI_QUOTA.idFromName('global'));
      const quota = await stub.fetch('https://quota.internal/check', {
        method: 'POST', body: JSON.stringify({ uid: user.sub }),
      });
      if (quota.status === 429) {
        const { reason } = await quota.json();
        return response(429, { error: reason === 'user' ? 'Your daily AI limit was reached. Try again after 5:30 a.m. Sri Lanka time.' : 'The shared daily AI limit was reached. Try again after 5:30 a.m. Sri Lanka time.' });
      }
      if (!quota.ok) throw new Error('Quota unavailable');
    } catch { return response(503, { error: 'AI service temporarily unavailable.' }); }
    try {
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: body.contents, systemInstruction: { parts: [{ text: SYSTEM }] }, generationConfig: { temperature: 0.4, maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'minimal' } } }),
        signal: AbortSignal.timeout(60000),
      });
      if (!upstream.ok) {
        // Return only the HTTP status category. Never disclose provider bodies,
        // which may include sensitive diagnostics or request information.
        if (upstream.status === 429) return response(502, { error: 'Gemini quota or rate limit reached. Try again later.' });
        if (upstream.status === 400 || upstream.status === 401 || upstream.status === 403) return response(502, { error: `Gemini rejected the request (HTTP ${upstream.status}). Check the server API key and Gemini access.` });
        if (upstream.status === 404) return response(502, { error: 'The Gemini model was not found or is unavailable for this key.' });
        return response(502, { error: `Gemini service error (HTTP ${upstream.status}). Try again later.` });
      }
      const data = await upstream.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) return response(502, { error: 'No AI response was available.' });
      return response(200, { text, model: MODEL });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return response(502, { error: 'Gemini took too long to respond. Please try again.' });
      if (error?.name === 'SyntaxError') return response(502, { error: 'Gemini returned an unreadable response. Please try again.' });
      return response(502, { error: 'Could not reach Gemini due to a network or provider error. Please try again.' });
    }
  },
};

// One named Durable Object serializes all usage for a global cap. Counters store
// Firebase UIDs and numbers only, not prompts, images, tokens or health data.
export class AiQuota {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    let uid;
    try { ({ uid } = await request.json()); } catch { return new Response(null, { status: 400 }); }
    if (typeof uid !== 'string' || !uid || uid.length > 128) return new Response(null, { status: 400 });
    const day = new Date().toISOString().slice(0, 10);
    const reason = await this.state.storage.transaction(async txn => {
      const record = await txn.get('quota');
      const quota = record?.day === day ? record : { day, total: 0, users: {} };
      const userKey = `uid:${uid}`;
      const count = quota.users[userKey] || 0;
      if (quota.total >= 100) return 'shared';
      if (count >= 30) return 'user';
      quota.total++; quota.users[userKey] = count + 1;
      await txn.put('quota', quota);
      return null;
    });
    return reason ? Response.json({ reason }, { status: 429 }) : new Response(null, { status: 204 });
  }
}
