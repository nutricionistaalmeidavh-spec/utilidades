import test from 'node:test';
import assert from 'node:assert/strict';
import { createQaConfig } from '../src/config.js';
import { withTerminals } from '../src/index.js';

test('config records visual evidence, accepts web/file targets and permits overrides', () => {
  assert.doesNotThrow(() => createQaConfig({ baseURL: 'file:///tmp/index.html' }));
  const config = createQaConfig({ baseURL: 'http://localhost:3000', workers: 1, use: { locale: 'pt-BR' } });
  assert.equal(config.use.trace, 'retain-on-failure');
  assert.equal(config.use.screenshot, 'on');
  assert.equal(config.use.video, 'on');
  assert.equal(config.use.locale, 'pt-BR');
  assert.equal(config.use.baseURL, 'http://localhost:3000');
  assert.deepEqual(config.use.viewport, { width: 1440, height: 900 });
  assert.equal(config.retries, 0);
  assert.equal(config.workers, 1);
  assert.throws(() => createQaConfig({ baseURL: 'ftp://localhost' }), /HTTP/);
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
  const browser = { async newContext() {
    return { async newPage() { return {}; }, async close() { closed++; } };
  } };
  const failure = new Error('scenario failed');
  await assert.rejects(withTerminals(browser, { count: 2 }, async terminals => {
    assert.equal(terminals.length, 2);
    assert.notEqual(terminals[0].context, terminals[1].context);
    throw failure;
  }), error => error === failure);
  assert.equal(closed, 2);
});
