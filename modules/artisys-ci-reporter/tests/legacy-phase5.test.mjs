import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRelease } from '../src/index.mjs';

test('summarizeRelease normalizes legacy AgroFrota phase5 artifacts when qa-summary is absent', () => {
  const summary = summarizeRelease({
    report: {
      status: 'blocked',
      failedStep: 'qa',
      steps: [{ id: 'qa', status: 'fail', exitCode: 1, command: 'powershell scripts/qa-phase5-release.ps1' }],
    },
    qaReport: null,
    legacyPhase5: {
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
    },
    installerPaths: ['release/ArtiSys-Lavoura-Setup.exe'],
  });

  assert.ok(summary.qa, 'legacy phase5 artifacts should produce a structured QA summary');
  assert.equal(summary.qa.failed, 1);
  assert.equal(summary.qa.failures[0].flow, 'qa:surface');
  assert.match(summary.qa.failures[0].error, /backup restore sentinel/);
  assert.match(summary.errorExcerpt, /QA 0\/1 PASS/);
});

test('summarizeRelease uses raw phase5 log tail when fallback has no useful diagnostic', () => {
  const summary = summarizeRelease({
    report: {
      status: 'blocked',
      failedStep: 'qa',
      steps: [{ id: 'qa', status: 'fail', exitCode: 1 }],
    },
    qaReport: null,
    legacyPhase5: {
      surface: null,
      playwright: null,
      fallback: {
        status: 'failed',
        failedStage: 'phase5',
        lastFailure: 'phase5 terminou sem diagnostico estruturado; consulte phase5-raw.log.',
      },
      rawLog: 'npm run check\nError: Cannot find module ./runtime/foo.mjs\nnpm ERR! Lifecycle script failed with error',
    },
    installerPaths: [],
  });

  assert.ok(summary.qa);
  assert.equal(summary.qa.failures[0].flow, 'phase5');
  assert.match(summary.qa.failures[0].error, /Cannot find module/);
});
