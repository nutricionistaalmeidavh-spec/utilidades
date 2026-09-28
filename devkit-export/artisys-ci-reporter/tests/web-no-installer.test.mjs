import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRelease } from '../src/index.mjs';

test('web QA report can pass without installer when installer is not required', () => {
  const summary = summarizeRelease({
    report: {
      status: 'pass',
      failedStep: null,
      steps: [{ id: 'qa:p2', status: 'pass', exitCode: 0 }],
    },
    installerPaths: [],
    installerRequired: false,
    fallbackStep: 'workflow',
  });

  assert.equal(summary.failedStep, 'workflow');
  assert.equal(summary.installerFound, false);
  assert.equal(summary.installerRequired, false);
  assert.equal(summary.errorExcerpt.includes('Installer esperado nao foi encontrado'), false);
});
