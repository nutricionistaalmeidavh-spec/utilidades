import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCloudTelemetryMirror, createTelemetryFanout } from '../src/cloud-observability.js';

test('cloud mirror posts heartbeat and job events using agent auth', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const cloud = createCloudTelemetryMirror({
    endpoint: 'https://qa.example.workers.dev/',
    token: 'agent-token',
    machineId: 'victor-pc',
    version: '2.4.1',
    fetchImpl,
  });
  await cloud.heartbeat({ stage: 'IDLE', detail: 'ready' });
  await cloud.transition({ jobId: 'job-1', projectId: 'pdv-artisys', stage: 'QUEUED', detail: 'accepted' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://qa.example.workers.dev/api/v1/heartbeat');
  assert.equal(calls[1].url, 'https://qa.example.workers.dev/api/v1/jobs/job-1/events');
  assert.equal(calls[0].options.headers.authorization, 'Bearer agent-token');
  const event = JSON.parse(calls[1].options.body);
  assert.equal(event.machineId, 'victor-pc');
  assert.equal(event.version, '2.4.1');
});

test('cloud mirror streams artifact with project metadata and safe relative path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cloud-'));
  const file = path.join(root, 'shot.png');
  await fs.writeFile(file, Buffer.from('png-data'));
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.body?.getReader) {
      const reader = options.body.getReader();
      while (!(await reader.read()).done) {}
    }
    return new Response(JSON.stringify({ ok: true, id: 'artifact-1' }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  const cloud = createCloudTelemetryMirror({ endpoint: 'https://qa.example.workers.dev', token: 'x', machineId: 'pc', fetchImpl });
  await cloud.recordArtifact({
    jobId: 'job-1',
    projectId: 'pdv-artisys',
    type: 'screenshot',
    name: 'shot.png',
    relativePath: 'flow-a/screenshots/shot.png',
    localPath: file,
    createdAt: '2026-09-11T20:00:00.000Z',
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/v1\/jobs\/job-1\/artifacts\?/);
  assert.match(calls[0].url, /projectId=pdv-artisys/);
  assert.match(calls[0].url, /relativePath=flow-a%2Fscreenshots%2Fshot.png/);
  assert.equal(calls[0].options.headers['content-type'], 'image/png');
});

test('fanout keeps local telemetry authoritative when cloud fails', async () => {
  const events = [];
  const local = {
    async transition(event) { events.push(event); return event; },
    async heartbeat() { return { ok: true }; },
    async recordArtifact(value) { return value; },
    async getSnapshot() { return { currentJob: null }; },
    async readEvents() { return []; },
    async readJob() { return null; },
    async listHistory() { return []; },
    async recoverInterruptedJob() { return null; },
  };
  const broken = {
    async transition() { throw new Error('offline'); },
    async heartbeat() { throw new Error('offline'); },
    async recordArtifact() { throw new Error('offline'); },
  };
  const telemetry = createTelemetryFanout(local, [broken]);
  const result = await telemetry.transition({ jobId: 'job-1', projectId: 'pdv', stage: 'QUEUED' });
  assert.equal(result.stage, 'QUEUED');
  assert.equal(events.length, 1);
});
