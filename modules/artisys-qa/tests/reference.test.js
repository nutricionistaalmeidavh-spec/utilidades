import test from 'node:test';
import assert from 'node:assert/strict';
import { createReferenceServer } from '../examples/pos-reference/server.js';
import { waitForHealth } from '../src/index.js';

test('real HTTP concurrency, idempotency, cancellation and cash closure', async () => {
  const server = createReferenceServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (path, data) => fetch(url + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  try {
    await waitForHealth(url + '/health');
    assert.equal((await post('/sales', { key: 'closed' })).status, 409);
    assert.equal((await post('/cash/open', { openingCents: -1 })).status, 400);
    assert.equal((await post('/cash/open', { openingCents: 2500 })).status, 201);
    const responses = await Promise.all([post('/sales', { key: 'A' }), post('/sales', { key: 'B' })]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    const winner = await responses.find(r => r.status === 201).json();
    assert.equal((await post('/sales', { key: winner.key })).status, 200);
    assert.equal((await (await fetch(url + '/state')).json()).cash.balanceCents, 3500);
    await post('/sales/cancel', { key: winner.key });
    await post('/sales/cancel', { key: winner.key });
    const state = await (await fetch(url + '/state')).json();
    assert.equal(state.stock, 1);
    assert.equal(state.cash.balanceCents, 2500);
    assert.equal(state.sales.length, 1);
    assert.equal((await post('/cash/close')).status, 200);
    assert.equal((await post('/sales', { key: 'new' })).status, 409);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('health checks time out and respect cancellation', async () => {
  await assert.rejects(waitForHealth('http://127.0.0.1:1', { timeoutMs: 30, intervalMs: 5 }), /timed out/);
  await assert.rejects(waitForHealth('http://127.0.0.1:1', { signal: AbortSignal.abort() }), { name: 'AbortError' });
});
