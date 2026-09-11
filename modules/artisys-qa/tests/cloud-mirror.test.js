import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCloudMirror } from '../src/cloud-mirror.js';

test('routes heartbeat, job and event telemetry with agent bearer auth', async () => {
  const calls = [];
  const mirror = createCloudMirror({
    endpoint: 'https://qa.example.workers.dev/',
    token: 'agent-token',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response('{}', { status: 202, headers: { 'content-type': 'application/json' } });
    },
  });
  await mirror.publish({ type: 'heartbeat', payload: { machineId: 'victor-pc', agent: { stage: 'IDLE' } } });
  await mirror.publish({ type: 'job', payload: { jobId: 'job-1', projectId: 'pdv', stage: 'RUNNING_QA' } });
  await mirror.publish({ type: 'event', payload: { jobId: 'job-1', projectId: 'pdv', stage: 'RUNNING_QA' } });
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/v1/heartbeat', '/api/v1/jobs/upsert', '/api/v1/events']);
  assert.equal(calls.every(call => call.options.headers.authorization === 'Bearer agent-token'), true);
});

test('uploads artifact bytes to the job artifact endpoint preserving safe relative path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cloud-artifact-'));
  const file = path.join(root, 'shot.png');
  await fs.writeFile(file, 'png-data');
  let seen = null;
  const mirror = createCloudMirror({
    endpoint: 'https://qa.example.workers.dev',
    token: 'agent-token',
    fetchImpl: async (url, options) => {
      seen = { url: String(url), options };
      return new Response('{}', { status: 201 });
    },
  });
  await mirror.publish({ type: 'artifact', payload: { jobId: 'job-1', projectId: 'pdv-artisys', type: 'screenshot', name: 'shot.png', relativePath: 'flow-a/screenshots/shot.png', localPath: file } });
  assert.equal(new URL(seen.url).pathname, '/api/v1/artifacts/job-1/flow-a/screenshots/shot.png');
  assert.equal(seen.options.method, 'PUT');
  assert.equal(seen.options.headers['x-project-id'], 'pdv-artisys');
  assert.equal(String(seen.options.body), 'png-data');
});

test('rejects unsafe or incomplete cloud configuration', () => {
  assert.throws(() => createCloudMirror({ endpoint: 'file:///tmp/x', token: 'x' }), /https/i);
  assert.throws(() => createCloudMirror({ endpoint: 'https://qa.example.workers.dev', token: '' }), /token/i);
});
