import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { executeBridgeJob } from '../src/bridge-worker.js';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-bridge-telemetry-'));
  const config = path.join(root, 'project', 'qa', 'artisys-qa.config.json');
  await fs.mkdir(path.dirname(config), { recursive: true });
  await fs.writeFile(config, '{}');
  const events = [];
  const telemetry = {
    transition: async event => { events.push(event); },
    heartbeat: async () => {},
    recordArtifact: async () => {},
  };
  return {
    root,
    events,
    telemetry,
    project: { id: 'pdv-artisys', config },
    job: { id: 'job-test-1234', action: 'release', options: {} },
    bridge: { drive: { enabled: true, remote: 'fake', rootFolderId: 'fake' } },
  };
}

test('successful bridge job emits complete lifecycle', async () => {
  const f = await fixture();
  const result = await executeBridgeJob({
    ...f,
    runProcessImpl: async () => ({ code: 0, stdout: 'ok', stderr: '' }),
    uploadImpl: async () => ({ uploaded: true, runPath: 'pdv/job' }),
  });
  assert.equal(result.status, 'passed');
  assert.deepEqual(f.events.map(event => event.stage), [
    'STARTING_QA','RUNNING_QA','GENERATING_REPORT','UPLOADING_ARTIFACTS','PASSED',
  ]);
});

test('successful QA with upload failure ends as pending upload', async () => {
  const f = await fixture();
  await executeBridgeJob({
    ...f,
    runProcessImpl: async () => ({ code: 0, stdout: 'ok', stderr: '' }),
    uploadImpl: async () => ({ uploaded: false, reason: 'upload-failed', error: 'offline' }),
  });
  assert.equal(f.events.at(-1).stage, 'PENDING_UPLOAD');
});

test('failed QA preserves evidence and emits FAILED', async () => {
  const f = await fixture();
  const error = new Error('boom');
  error.stdout = 'stdout';
  error.stderr = 'stderr';
  const result = await executeBridgeJob({
    ...f,
    runProcessImpl: async () => { throw error; },
    uploadImpl: async () => ({ uploaded: true }),
  });
  assert.equal(result.status, 'failed');
  assert.equal(f.events.at(-1).stage, 'FAILED');
  assert.equal(await fs.readFile(path.join(result.outputDir, 'bridge-result.json'), 'utf8').then(text => JSON.parse(text).status), 'failed');
});
