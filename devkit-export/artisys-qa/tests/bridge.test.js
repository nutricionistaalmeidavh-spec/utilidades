import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateBridgeJob, markBridgeJobProcessed, loadProcessedJobs } from '../src/bridge-jobs.js';
import { buildDriveRunPath } from '../src/drive-uploader.js';
import { ensureBridgeConfiguration, DEFAULT_DRIVE_ROOT_FOLDER_ID } from '../src/bridge-worker.js';

function validJob(overrides = {}) {
  const now = Date.now();
  return {
    id: 'job-20260911-abcdef01',
    nonce: '0123456789abcdef0123456789abcdef',
    machineId: 'machine-1',
    projectId: 'pdv-nexus',
    action: 'full',
    requestedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
    options: { viewport: 'desktop', visual: true },
    ...overrides,
  };
}

const projects = [{ id: 'pdv-nexus', enabled: true }];

test('bridge accepts only whitelisted QA jobs for a registered project and machine', () => {
  const job = validateBridgeJob(validJob(), { machineId: 'machine-1', projects });
  assert.equal(job.action, 'full');
  assert.equal(job.projectId, 'pdv-nexus');
  assert.equal(job.options.viewport, 'desktop');
});

test('bridge rejects arbitrary commands, unknown options, other machines and stale jobs', () => {
  assert.throws(() => validateBridgeJob(validJob({ action: 'shell' }), { machineId: 'machine-1', projects }), /Unsupported bridge action/);
  assert.throws(() => validateBridgeJob(validJob({ options: { command: 'whoami' } }), { machineId: 'machine-1', projects }), /Unsupported bridge option/);
  assert.throws(() => validateBridgeJob(validJob({ machineId: 'machine-2' }), { machineId: 'machine-1', projects }), /another machine/);
  const expired = validJob({
    requestedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
    expiresAt: new Date(Date.now() - 10 * 60_000).toISOString(),
  });
  assert.throws(() => validateBridgeJob(expired, { machineId: 'machine-1', projects }), /expired/);
});

test('processed job registry blocks replay and persists locally', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-bridge-'));
  await markBridgeJobProcessed('job-1', { status: 'passed' }, root);
  const processed = await loadProcessedJobs(root);
  assert.equal(processed['job-1'].status, 'passed');
  assert.ok(processed['job-1'].processedAt);
});

test('Drive run path isolates every project and execution', () => {
  const value = buildDriveRunPath({ id: 'PDV Nexus' }, { id: 'job:001' }, new Date('2026-09-11T12:00:00Z'));
  assert.equal(value, 'PDV-Nexus/2026-09-11/job-001');
});

test('bridge configuration creates stable machine identity and Drive root defaults', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-bridge-state-'));
  const first = await ensureBridgeConfiguration(root);
  const second = await ensureBridgeConfiguration(root);
  assert.equal(first.bridge.machineId, second.bridge.machineId);
  assert.equal(first.bridge.drive.rootFolderId, DEFAULT_DRIVE_ROOT_FOLDER_ID);
  assert.equal(first.bridge.drive.enabled, false);
  assert.equal(first.bridge.enabled, true);
});
