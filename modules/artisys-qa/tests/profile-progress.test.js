import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runQaProfile } from '../src/profile-runner.js';

test('profile runner reports flow progress and final gate', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-profile-progress-'));
  const outputRoot = path.join(rootDir, 'out');
  const manifest = {
    schemaVersion: 1,
    systemId: 'pdv-artisys',
    mode: 'web',
    environments: { ci: { baseURL: 'http://127.0.0.1' } },
    flows: { smoke: 'smoke.json', sale: 'sale.json' },
    qaProfiles: { release: { flows: ['smoke', 'sale'], criticalFlows: ['smoke', 'sale'], includeDesktop: false, includeNetwork: false } },
  };
  const events = [];
  const flowRunner = async ({ flowName, onProgress }) => {
    await onProgress?.({ type: 'step-start', flow: flowName, step: 'open', current: 1, total: 1 });
    return { outputDir: path.join(outputRoot, flowName), summary: { startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), status: 'passed' } };
  };
  const result = await runQaProfile({
    manifest,
    rootDir,
    profileName: 'release',
    environment: 'ci',
    viewport: 'desktop',
    outputRoot,
    flowRunner,
    onProgress: event => events.push(event),
  });
  assert.equal(result.gate.allowed, true);
  assert.deepEqual(events.filter(e => e.type === 'flow-start').map(e => e.flow), ['smoke', 'sale']);
  assert.deepEqual(events.filter(e => e.type === 'flow-end').map(e => e.status), ['passed', 'passed']);
  assert.equal(events.find(e => e.type === 'profile-start').total, 2);
  assert.equal(events.at(-1).type, 'profile-end');
  assert.equal(events.at(-1).gateAllowed, true);
});
