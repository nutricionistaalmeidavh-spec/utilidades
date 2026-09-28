import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildCiQaSummary, writeCiQaSummary } from '../src/ci-summary.js';

test('normalizes native QA report into reporter contract', () => {
  const summary = buildCiQaSummary({
    report: {
      systemId: 'oficina',
      profile: 'release',
      gate: { allowed: false },
      runs: [
        { flow: 'login', status: 'passed', outputDir: 'qa/login' },
        { flow: 'venda', status: 'failed', error: 'botao ausente', outputDir: 'qa/venda', summary: { steps: [{ name: 'Finalizar venda', action: 'click', status: 'failed', error: 'botao ausente' }] } },
      ],
    },
  });
  assert.equal(summary.status, 'FAIL');
  assert.deepEqual(summary.counts, { flowsPassed: 1, flowsFailed: 1 });
  assert.equal(summary.flows[1].flow, 'venda');
  assert.equal(summary.flows[1].failedStep.name, 'Finalizar venda');
  assert.match(summary.flows[1].evidence.screenshot, /failure\.png$/);
});

test('writes emergency summary even when execution crashes before native report', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-ci-summary-'));
  try {
    const target = path.join(root, 'artifacts', 'qa-summary.json');
    const out = await writeCiQaSummary({
      targetPath: target,
      systemId: 'frota',
      profile: 'release',
      status: 'FAIL',
      failure: new Error('browser morreu'),
      lastProgress: { type: 'step-start', flow: 'manutencao', step: 'Salvar OS' },
      logPath: 'artifacts/qa-user-all.log',
    });
    const parsed = JSON.parse(await fs.readFile(out.file, 'utf8'));
    assert.equal(parsed.status, 'FAIL');
    assert.deepEqual(parsed.counts, { flowsPassed: 0, flowsFailed: 1 });
    assert.equal(parsed.flows[0].flow, 'manutencao');
    assert.equal(parsed.flows[0].failedStep.name, 'Salvar OS');
    assert.equal(parsed.failure.message, 'browser morreu');
    assert.equal(parsed.artifacts.log, 'artifacts/qa-user-all.log');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
