const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');

test('requires verified Firebase identity, validates content, and limits usage', async t => {
  let calls = 0;
  const server = createServer({ apiKey: 'test', verifyToken: async token => {
    if (token === 'bad') throw new Error('bad');
    return { uid: token, email_verified: token !== 'unverified' };
  }, fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] }) }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] });
  const post = (token, payload = body) => fetch(base + '/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: payload });
  assert.equal((await fetch(base + '/health')).status, 200);
  assert.equal((await post(null)).status, 401);
  assert.equal((await post('bad')).status, 401);
  assert.equal((await post('unverified')).status, 403);
  assert.equal((await post('invalid', '{}')).status, 400);
  const ok = await post('user'); assert.equal(ok.status, 200); assert.equal((await ok.json()).text, 'Hello');
  for (let i = 0; i < 9; i++) assert.equal((await post('user')).status, 200);
  assert.equal((await post('user')).status, 429);
  assert.equal(calls, 10);
});
