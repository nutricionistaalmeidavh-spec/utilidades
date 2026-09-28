import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAgentConsole } from '../src/agent-console.js';

async function request(url, token, pathName) {
  return fetch(`${url}${pathName}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
}

test('LAN binding requires token and exposes read-only authenticated telemetry', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-console-'));
  const telemetry = {
    getSnapshot: async () => ({ currentJob: { jobId: 'job-1', stage: 'RUNNING_QA' }, heartbeatAt: '2026-09-11T00:00:00.000Z', artifacts: [] }),
    readJob: async id => ({ jobId: id, stage: 'RUNNING_QA' }),
    readEvents: async () => [{ stage: 'RUNNING_QA' }],
    listHistory: async () => [{ jobId: 'job-1', stage: 'PASSED' }],
  };
  assert.throws(() => createAgentConsole({ host: '0.0.0.0', port: 0, token: '', telemetry, agentState: async () => ({ projects: [] }), artifactRoot: path.join(root, 'artifacts'), lanEnabled: true }), /token/i);
  const server = createAgentConsole({ host: '127.0.0.1', port: 0, token: 'abc123', telemetry, agentState: async () => ({ projects: [{ id: 'pdv' }] }), artifactRoot: path.join(root, 'artifacts') });
  const started = await server.start();
  try {
    const unauth = await request(started.baseURL, '', '/api/jobs/current');
    assert.equal(unauth.status, 401);
    const current = await request(started.baseURL, 'abc123', '/api/jobs/current');
    assert.equal(current.status, 200);
    assert.equal(current.headers.get('cache-control'), 'no-store');
    assert.equal(current.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await current.json()).currentJob.stage, 'RUNNING_QA');
    const post = await fetch(`${started.baseURL}/api/jobs/current`, { method: 'POST', headers: { authorization: 'Bearer abc123' } });
    assert.equal(post.status, 405);
  } finally { await server.close(); }
});

test('artifact route blocks traversal and serves whitelisted files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-console-'));
  const artifactRoot = path.join(root, 'artifacts');
  const file = path.join(artifactRoot, 'pdv', 'bridge', 'job-1', 'shot.png');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, 'pngdata');
  const telemetry = { getSnapshot: async () => ({ currentJob: null, artifacts: [] }), readJob: async () => null, readEvents: async () => [], listHistory: async () => [] };
  const server = createAgentConsole({ host: '127.0.0.1', port: 0, token: 'abc123', telemetry, agentState: async () => ({ projects: [] }), artifactRoot });
  const started = await server.start();
  try {
    const ok = await request(started.baseURL, 'abc123', '/artifacts/pdv/bridge/job-1/shot.png');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/png');
    const traversal = await request(started.baseURL, 'abc123', '/artifacts/%2e%2e/%2e%2e/secret.txt');
    assert.ok([400,404].includes(traversal.status));
  } finally { await server.close(); }
});
