import test from 'node:test';
import assert from 'node:assert/strict';

async function loadNormalizer() {
  try {
    return await import('../src/legacy-phase5.mjs');
  } catch {
    return null;
  }
}

test('legacy phase5 artifacts normalize into structured QA failures', async () => {
  const mod = await loadNormalizer();
  assert.ok(mod?.normalizeLegacyPhase5QaReport, 'normalizeLegacyPhase5QaReport must exist');

  const qaReport = mod.normalizeLegacyPhase5QaReport({
    surface: {
      status: 'failed',
      error: 'AssertionError: expected backup restore sentinel before, received after',
    },
    playwright: null,
    fallback: {
      status: 'failed',
      failedStage: 'qa:surface',
      lastFailure: 'AssertionError: expected backup restore sentinel before, received after',
    },
    rawLog: '[PASS] Autenticação\n[FAIL] FASE 5 - expected backup restore sentinel before, received after',
    artifacts: {
      log: 'qa-artifacts/phase5-raw.log',
      phase5Summary: 'qa-artifacts/phase5-summary.json',
      playwrightSummary: 'qa-artifacts/playwright-summary.json',
      fallbackSummary: 'qa-artifacts/phase5-fallback-summary.json',
    },
  });

  assert.equal(qaReport.status, 'FAIL');
  assert.deepEqual(qaReport.counts, { flowsPassed: 0, flowsFailed: 1 });
  assert.equal(qaReport.flows[0].flow, 'qa:surface');
  assert.equal(qaReport.flows[0].status, 'FAIL');
  assert.match(qaReport.flows[0].error, /backup restore sentinel/);
  assert.equal(qaReport.artifacts.log, 'qa-artifacts/phase5-raw.log');
});

test('legacy phase5 normalizer falls back to useful raw log tail', async () => {
  const mod = await loadNormalizer();
  assert.ok(mod?.normalizeLegacyPhase5QaReport, 'normalizeLegacyPhase5QaReport must exist');

  const qaReport = mod.normalizeLegacyPhase5QaReport({
    surface: null,
    playwright: null,
    fallback: {
      status: 'failed',
      failedStage: 'phase5',
      lastFailure: 'phase5 terminou sem diagnostico estruturado; consulte phase5-raw.log.',
    },
    rawLog: 'npm run check\nError: Cannot find module ./runtime/foo.mjs\nnpm ERR! Lifecycle script failed with error',
  });

  assert.equal(qaReport.status, 'FAIL');
  assert.equal(qaReport.flows[0].flow, 'phase5');
  assert.match(qaReport.flows[0].error, /Cannot find module/);
});

test('legacy phase5 normalizer keeps separate surface and web results when both exist', async () => {
  const mod = await loadNormalizer();
  assert.ok(mod?.normalizeLegacyPhase5QaReport, 'normalizeLegacyPhase5QaReport must exist');

  const qaReport = mod.normalizeLegacyPhase5QaReport({
    surface: { status: 'passed' },
    playwright: { status: 'failed', exitCode: 1 },
    fallback: { status: 'failed', failedStage: 'qa:web', lastFailure: 'Playwright falhou com exit code 1' },
    rawLog: 'TimeoutError: page.getByRole("button", { name: "Salvar" }) timed out',
  });

  assert.deepEqual(qaReport.counts, { flowsPassed: 1, flowsFailed: 1 });
  assert.equal(qaReport.flows[0].flow, 'qa:surface');
  assert.equal(qaReport.flows[0].status, 'PASS');
  assert.equal(qaReport.flows[1].flow, 'qa:web');
  assert.equal(qaReport.flows[1].status, 'FAIL');
  assert.match(qaReport.flows[1].error, /TimeoutError|Playwright/);
});
