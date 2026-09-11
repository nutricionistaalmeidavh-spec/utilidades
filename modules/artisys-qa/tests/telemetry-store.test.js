import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTelemetryStore } from '../src/telemetry-store.js';

async function tempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'artisys-telemetry-'));
}

test('persists current stage, bounded events, redaction and artifacts', async () => {
  const root = await tempRoot();
  const telemetry = createTelemetryStore({
    root,
    machineId: 'victor-pc',
    maxEvents: 2,
    redact: value => JSON.parse(JSON.stringify(value).replaceAll('secret-value', '[REDACTED]')),
  });
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv-artisys', stage: 'QUEUED', detail: 'secret-value queued' });
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv-artisys', stage: 'STARTING_QA', detail: 'starting' });
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv-artisys', stage: 'RUNNING_QA', detail: 'Flow smoke', progress: { current: 1, total: 3 } });
  const artifact = path.join(root, 'artifacts', 'pdv-artisys', 'shot.png');
  await fs.mkdir(path.dirname(artifact), { recursive: true });
  await fs.writeFile(artifact, 'png');
  await telemetry.recordArtifact({ jobId: 'job-1', projectId: 'pdv-artisys', type: 'screenshot', name: 'shot.png', localPath: artifact, size: 3 });
  const snapshot = await telemetry.getSnapshot();
  assert.equal(snapshot.currentJob.stage, 'RUNNING_QA');
  assert.deepEqual(snapshot.currentJob.progress, { current: 1, total: 3 });
  assert.equal(snapshot.currentJob.detail, 'Flow smoke');
  assert.equal(snapshot.artifacts.length, 1);
  const persistedJob = await telemetry.readJob('job-1');
  assert.equal(persistedJob.artifacts.length, 1);
  assert.equal(persistedJob.artifacts[0].name, 'shot.png');
  const events = await telemetry.readEvents({ jobId: 'job-1', limit: 10 });
  assert.equal(events.length, 2);
  const raw = await fs.readFile(path.join(root, 'telemetry', 'events.ndjson'), 'utf8');
  assert.equal(raw.includes('secret-value'), false);
});

test('serializes concurrent heartbeat, stage and artifact mutations', async () => {
  const root = await tempRoot();
  const telemetry = createTelemetryStore({ root, machineId: 'victor-pc' });
  await telemetry.transition({ jobId: 'job-race', projectId: 'pdv', stage: 'QUEUED' });
  await telemetry.transition({ jobId: 'job-race', projectId: 'pdv', stage: 'STARTING_QA' });
  await telemetry.transition({ jobId: 'job-race', projectId: 'pdv', stage: 'RUNNING_QA' });
  const artifactRoot = path.join(root, 'artifacts', 'pdv');
  await fs.mkdir(artifactRoot, { recursive: true });
  const one = path.join(artifactRoot, 'one.png');
  const two = path.join(artifactRoot, 'two.png');
  await Promise.all([fs.writeFile(one, '1'), fs.writeFile(two, '2')]);
  await Promise.all([
    telemetry.heartbeat({ stage: 'RUNNING_QA', detail: 'alive', projectId: 'pdv' }),
    telemetry.recordArtifact({ jobId: 'job-race', projectId: 'pdv', type: 'screenshot', localPath: one }),
    telemetry.recordArtifact({ jobId: 'job-race', projectId: 'pdv', type: 'screenshot', localPath: two }),
    telemetry.transition({ jobId: 'job-race', projectId: 'pdv', stage: 'RUNNING_QA', detail: 'step 2' }),
  ]);
  const snapshot = await telemetry.getSnapshot();
  assert.equal(snapshot.currentJob.detail, 'step 2');
  assert.equal(snapshot.artifacts.filter(item => item.jobId === 'job-race').length, 2);
  assert.equal((await telemetry.readJob('job-race')).artifacts.length, 2);
});

test('rejects invalid transitions and artifact traversal', async () => {
  const root = await tempRoot();
  const telemetry = createTelemetryStore({ root, machineId: 'victor-pc' });
  await assert.rejects(() => telemetry.transition({ jobId: 'job-1', projectId: 'pdv', stage: 'RUNNING_QA' }), /transition/i);
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv', stage: 'QUEUED' });
  await assert.rejects(() => telemetry.recordArtifact({ jobId: 'job-1', type: 'log', name: 'x', localPath: path.resolve(root, '..', 'secret.txt') }), /outside/i);
});

test('recovers an active job as interrupted', async () => {
  const root = await tempRoot();
  const telemetry = createTelemetryStore({ root, machineId: 'victor-pc' });
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv', stage: 'QUEUED' });
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv', stage: 'STARTING_QA' });
  await telemetry.transition({ jobId: 'job-1', projectId: 'pdv', stage: 'RUNNING_QA' });
  const recovered = await telemetry.recoverInterruptedJob();
  assert.equal(recovered.stage, 'INTERRUPTED');
  assert.equal((await telemetry.readJob('job-1')).stage, 'INTERRUPTED');
});

test('heartbeat can expose agent-level bootstrap stage without a job', async () => {
  const root = await tempRoot();
  const telemetry = createTelemetryStore({ root, machineId: 'victor-pc' });
  await telemetry.heartbeat({ stage: 'SYNCING_PROJECT', detail: 'Syncing pdv-artisys', projectId: 'pdv-artisys' });
  const snapshot = await telemetry.getSnapshot();
  assert.equal(snapshot.agent.stage, 'SYNCING_PROJECT');
  assert.equal(snapshot.agent.projectId, 'pdv-artisys');
});

test('pending upload can resume after becoming terminal', async () => {
  const root = await tempRoot();
  const telemetry = createTelemetryStore({ root, machineId: 'victor-pc' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'QUEUED' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'STARTING_QA' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'RUNNING_QA' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'UPLOADING_ARTIFACTS' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'PENDING_UPLOAD' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'UPLOADING_ARTIFACTS' });
  await telemetry.transition({ jobId: 'job-2', projectId: 'pdv', stage: 'PASSED' });
  assert.equal((await telemetry.readJob('job-2')).stage, 'PASSED');
});
