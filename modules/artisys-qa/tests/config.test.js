import test from 'node:test';
import assert from 'node:assert/strict';
import { createQaConfig } from '../src/config.js';
import { withTerminals } from '../src/index.js';

test('config retains failure evidence, rejects invalid transport and permits product overrides', () => {
  assert.throws(() => createQaConfig({ baseURL: 'file:///tmp' }), /HTTP/);
  const config = createQaConfig({ baseURL: 'http://localhost:3000', workers: 1, use: { locale: 'pt-BR' } });
  assert.equal(config.use.trace, 'retain-on-failure');
  assert.equal(config.use.locale, 'pt-BR');
  assert.equal(config.use.baseURL, 'http://localhost:3000');
  assert.equal(config.retries, 0);
  assert.equal(config.workers, 1);
});

test('partial terminal initialization closes already-created contexts', async () => {
  let created = 0, closed = 0;
  const browser = { async newContext() {
    if (++created === 2) throw new Error('launch failed');
    return { async close() { closed++; } };
  } };
  await assert.rejects(withTerminals(browser, { count: 2 }, () => {}), /launch failed/);
  assert.equal(closed, 1);
});

test('terminal callback failure closes every context and preserves failure', async () => {
  let closed = 0;
  const contexts = [];
  const browser = { async newContext() {
    const context = { async newPage() { return {}; }, async close() { closed++; } };
    contexts.push(context);
    return context;
  } };
  const failure = new Error('scenario failed');
  await assert.rejects(withTerminals(browser, { count: 2 }, async terminals => {
    assert.equal(terminals.length, 2);
    assert.notEqual(terminals[0].context, terminals[1].context);
    throw failure;
  }), error => error === failure);
  assert.equal(closed, 2);
});
