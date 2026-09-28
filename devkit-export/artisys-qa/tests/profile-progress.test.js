import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runQaProfile } from '../src/profile-runner.js';

test('profile runner reports flow progress, final gate and shared CI summary', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-profile-progress-'));
  try {
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
    assert.ok(result.ciSummaryFile);
    const ciSummary = JSON.parse(await fs.readFile(result.ciSummaryFile, 'utf8'));
    assert.equal(ciSummary.status, 'PASS');
    assert.deepEqual(ciSummary.counts, { flowsPassed: 2, flowsFailed: 0 });
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test('release profile exports failure detail before throwing the gate error', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-profile-failure-'));
  try {
    const manifest = {
      schemaVersion: 1,
      systemId: 'oficina',
      mode: 'web',
      environments: { ci: { baseURL: 'http://127.0.0.1' } },
      flows: { sale: 'sale.json' },
      qaProfiles: { release: { flows: ['sale'], criticalFlows: ['sale'], includeDesktop: false, includeNetwork: false } },
    };
    const flowRunner = async ({ onProgress }) => {
      await onProgress?.({ type: 'step-start', flow: 'sale', step: 'Finalizar venda', current: 1, total: 1 });
      const error = new Error('botao ausente');
      error.summary = {
        flow: 'sale',
        steps: [{ index: 0, action: 'click', name: 'Finalizar venda', status: 'failed', error: 'botao ausente' }],
        failure: { message: 'botao ausente' },
      };
      throw error;
    };
    let caught = null;
    try {
      await runQaProfile({ manifest, rootDir, profileName: 'release', environment: 'ci', outputRoot: path.join(rootDir, 'out'), flowRunner });
    } catch (error) {
      caught = error;
    }
    assert.ok(caught);
    assert.ok(caught.reportFiles?.ciSummaryFile);
    const ciSummary = JSON.parse(await fs.readFile(caught.reportFiles.ciSummaryFile, 'utf8'));
    assert.equal(ciSummary.status, 'FAIL');
    assert.deepEqual(ciSummary.counts, { flowsPassed: 0, flowsFailed: 1 });
    assert.equal(ciSummary.flows[0].flow, 'sale');
    assert.equal(ciSummary.flows[0].failedStep.name, 'Finalizar venda');
    assert.equal(ciSummary.flows[0].error, 'botao ausente');
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});
