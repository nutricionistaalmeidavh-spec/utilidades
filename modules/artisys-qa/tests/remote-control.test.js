import test from 'node:test';
import assert from 'node:assert/strict';
import { createQaRemoteControl } from '../src/remote-control.js';

const meta = {
  systemId: 'oficina-agro',
  flows: ['smoke', 'regression'],
  profiles: ['quick', 'full', 'release'],
  environments: ['local'],
  viewports: ['desktop', 'tablet', 'mobile'],
  defaults: { flow: 'smoke', environment: 'local', viewport: 'desktop' },
};

async function withServer(options, run) {
  const control = createQaRemoteControl(options);
  const started = await control.start();
  try {
    await run({ ...started, control });
  } finally {
    await control.close();
  }
}

async function api(baseURL, token, pathname, options = {}) {
  return fetch(`${baseURL}${pathname}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

test('API rejects requests without the remote token', async () => {
  await withServer({ host: '127.0.0.1', port: 0, token: 'secret', meta, runJob: async () => ({}) }, async ({ baseURL }) => {
    const response = await fetch(`${baseURL}/api/status`);
    assert.equal(response.status, 401);
  });
});

test('API exposes only configured QA choices and starts the same QA runner', async () => {
  const calls = [];
  await withServer({
    host: '127.0.0.1',
    port: 0,
    token: 'secret',
    meta,
    runJob: async request => {
      calls.push(request);
      return { summary: { passed: 4, failed: 0 }, outputDir: '/tmp/qa-artifacts/run-1' };
    },
  }, async ({ baseURL }) => {
    const metaResponse = await api(baseURL, 'secret', '/api/meta');
    assert.equal(metaResponse.status, 200);
    assert.deepEqual(await metaResponse.json(), meta);

    const runResponse = await api(baseURL, 'secret', '/api/run', {
      method: 'POST',
      body: JSON.stringify({ flow: 'regression', environment: 'local', viewport: 'mobile', visual: true }),
    });
    assert.equal(runResponse.status, 202);

    for (let i = 0; i < 20; i++) {
      const status = await (await api(baseURL, 'secret', '/api/status')).json();
      if (status.state === 'passed') break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    assert.deepEqual(calls, [{ profile: null, flow: 'regression', environment: 'local', viewport: 'mobile', visual: true }]);
    const finalStatus = await (await api(baseURL, 'secret', '/api/status')).json();
    assert.equal(finalStatus.state, 'passed');
    assert.equal(finalStatus.result.summary.failed, 0);
  });
});

test('API can start a whitelisted QA profile and ignores flow selection', async () => {
  const calls = [];
  await withServer({ host: '127.0.0.1', port: 0, token: 'secret', meta, runJob: async request => { calls.push(request); return {}; } }, async ({ baseURL }) => {
    const response = await api(baseURL, 'secret', '/api/run', {
      method: 'POST',
      body: JSON.stringify({ profile: 'release', flow: 'regression', environment: 'local', viewport: 'desktop' }),
    });
    assert.equal(response.status, 202);
    for (let i = 0; i < 20 && !calls.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls[0].profile, 'release');
    assert.equal(calls[0].flow, null);
  });
});

test('API exposes bounded local history when configured', async () => {
  await withServer({ host: '127.0.0.1', port: 0, token: 'secret', meta, runJob: async () => ({}), getHistory: async () => [{ profile: 'quick' }] }, async ({ baseURL }) => {
    const response = await api(baseURL, 'secret', '/api/history');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ profile: 'quick' }]);
  });
});

test('API rejects values that are not present in the QA manifest', async () => {
  await withServer({ host: '127.0.0.1', port: 0, token: 'secret', meta, runJob: async () => ({}) }, async ({ baseURL }) => {
    const response = await api(baseURL, 'secret', '/api/run', {
      method: 'POST',
      body: JSON.stringify({ flow: 'arbitrary-shell-command', environment: 'local', viewport: 'desktop', visual: false }),
    });
    assert.equal(response.status, 400);
  });
});

test('remote control allows only one QA execution at a time', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  await withServer({ host: '127.0.0.1', port: 0, token: 'secret', meta, runJob: async () => blocked }, async ({ baseURL }) => {
    const first = await api(baseURL, 'secret', '/api/run', { method: 'POST', body: JSON.stringify({}) });
    assert.equal(first.status, 202);
    const second = await api(baseURL, 'secret', '/api/run', { method: 'POST', body: JSON.stringify({}) });
    assert.equal(second.status, 409);
    release({ summary: { passed: 1, failed: 0 } });
  });
});

test('non-loopback binding requires an explicit token', () => {
  assert.throws(
    () => createQaRemoteControl({ host: '0.0.0.0', port: 4173, meta, runJob: async () => ({}) }),
    /token is required/i,
  );
});
