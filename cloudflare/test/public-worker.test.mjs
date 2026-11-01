import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { AiQuota } from '../public-worker.mjs';

const encoder = new TextEncoder();
const b64 = bytes => Buffer.from(bytes).toString('base64url');
const bjson = data => b64(encoder.encode(JSON.stringify(data)));

test('Firebase signatures, verified account, quota and payload are enforced', async t => {
  const pair = await crypto.subtle.generateKey({ name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256' }, true, ['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey); jwk.kid = 'test-key';
  const env = { FIREBASE_PROJECT_ID:'test-project', GEMINI_API_KEY:'example-key', AI_QUOTA: { idFromName: () => 'global', get: () => ({ fetch: async () => new Response(null, { status: 204 }) }) } };
  const now = Math.floor(Date.now() / 1000);
  const claims = { aud:'test-project', iss:'https://securetoken.google.com/test-project', sub:'allowed-user', email_verified:true, iat:now-30, auth_time:now-30, exp:now+300 };
  const sign = async (payload, header = { alg:'RS256', kid:'test-key' }) => {
    const payloadText = `${bjson(header)}.${bjson(payload)}`;
    return `${payloadText}.${b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, encoder.encode(payloadText)))}`;
  };
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  let upstreamStatus = 200;
  let upstreamException = null;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('www.googleapis.com/')) return Response.json({ keys:[jwk] }, { headers:{ 'Cache-Control':'public, max-age=60' } });
    assert.equal(options.headers['x-goog-api-key'], 'example-key');
    assert.match(String(url), /gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(JSON.parse(options.body).generationConfig.thinkingConfig.thinkingLevel, 'minimal');
    upstreamCalls++;
    if (upstreamException) throw upstreamException;
    if (upstreamStatus !== 200) return Response.json({ error: 'sensitive provider body' }, { status: upstreamStatus });
    return Response.json({ candidates:[{ content:{ parts:[{ text:'Test response' }] } }] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const body = JSON.stringify({ contents:[{ role:'user', parts:[{ text:'hello' }] }] });
  const post = (token, data = body, override = env) => worker.fetch(new Request('https://test.example/api/coach', { method:'POST', headers:token ? { Authorization:`Bearer ${token}` } : {}, body:data }), override);
  assert.equal((await worker.fetch(new Request('https://test.example/health'), {})).status, 200);
  assert.equal((await post(null)).status, 401);
  assert.equal((await post('bad')).status, 401);
  assert.equal((await post(await sign({ ...claims, exp:now-1 }))).status, 401);
  assert.equal((await post(await sign({ ...claims, aud:'other' }))).status, 401);
  assert.equal((await post(await sign({ ...claims, sub:'other-user' }))).status, 200);
  assert.equal((await post(await sign({ ...claims, email_verified:false }))).status, 403);
  const validToken = await sign(claims);
  const badSignature = `${validToken.slice(0, validToken.lastIndexOf('.')+1)}${b64(new Uint8Array(256))}`;
  assert.equal((await post(badSignature)).status, 401);
  assert.equal((await post(validToken, '{}')).status, 400);
  assert.equal((await post(validToken, body, { ...env, AI_QUOTA:undefined })).status, 503);
  const result = await post(validToken);
  assert.equal(result.status, 200); assert.equal((await result.json()).text, 'Test response'); assert.equal(upstreamCalls, 2);
  assert.equal((await post(validToken, body, { ...env, AI_QUOTA: { idFromName: () => 'global', get: () => ({ fetch: async () => Response.json({ reason: 'user' }, { status: 429 }) }) } })).status, 429);
  assert.equal(upstreamCalls, 2);
  for (const [status, expected] of [[400, 'HTTP 400'], [403, 'HTTP 403'], [404, 'model'], [429, 'quota'], [500, 'HTTP 500']]) {
    upstreamStatus = status;
    const result = await post(validToken);
    assert.equal(result.status, 502);
    const message = (await result.json()).error;
    assert.ok(message.includes(expected));
    assert.ok(!message.includes('sensitive provider body'));
  }
  upstreamStatus = 200;
  for (const [name, expected] of [['TimeoutError', 'too long'], ['SyntaxError', 'unreadable'], ['TypeError', 'network']]) {
    upstreamException = Object.assign(new Error('sensitive details'), { name });
    const result = await post(validToken);
    assert.equal(result.status, 502);
    const message = (await result.json()).error;
    assert.ok(message.includes(expected));
    assert.ok(!message.includes('sensitive details'));
  }
});

test('durable quota enforces per-user and shared daily caps', async () => {
  let saved;
  const storage = { transaction: fn => fn({ get: async () => saved ? structuredClone(saved) : undefined, put: async (_key, value) => { saved = structuredClone(value); } }) };
  const quota = new AiQuota({ storage });
  const call = uid => quota.fetch(new Request('https://quota.internal/check', { method:'POST', body:JSON.stringify({ uid }) }));
  for (let i = 0; i < 30; i++) assert.equal((await call('first')).status, 204);
  const userLimit = await call('first');
  assert.equal(userLimit.status, 429);
  assert.equal((await userLimit.json()).reason, 'user');
  for (let user = 1; user <= 7; user++) for (let i = 0; i < 10; i++) assert.equal((await call(`user-${user}`)).status, 204);
  const sharedLimit = await call('another');
  assert.equal(sharedLimit.status, 429);
  assert.equal((await sharedLimit.json()).reason, 'shared');
  saved.day = '2000-01-01';
  assert.equal((await call('first')).status, 204);
});
