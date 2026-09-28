import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRelease, buildFailureMarkdown } from '../src/index.mjs';

test('summarizeRelease preserves blocking security finding details', () => {
  const summary = summarizeRelease({
    report: {
      status: 'fail',
      failedStep: 'release-gate',
      steps: [{ id: 'release-gate', status: 'block', exitCode: 3, stderr: 'release blocked' }],
      blockingFindings: [{
        severity: 'high',
        tool: 'trivy',
        ruleId: 'CVE-2099-0001',
        message: 'Dependency has a known vulnerability.',
        path: 'package-lock.json',
        package: 'example-lib',
        version: '1.2.3',
        evidence: 'fixed in 1.2.4',
      }],
    },
    installerRequired: false,
  });

  assert.equal(summary.blockingFindings.length, 1);
  assert.deepEqual(summary.blockingFindings[0], {
    severity: 'high',
    tool: 'trivy',
    ruleId: 'CVE-2099-0001',
    message: 'Dependency has a known vulnerability.',
    path: 'package-lock.json',
    url: null,
    package: 'example-lib',
    version: '1.2.3',
    evidence: 'fixed in 1.2.4',
    remediation: null,
  });
  assert.match(summary.errorExcerpt, /CVE-2099-0001/);
});

test('summarizeRelease falls back to the concrete failing gate when failedStep is only a group label', () => {
  const summary = summarizeRelease({
    report: {
      status: 'fail',
      failedStep: 'dynamic-scan',
      steps: [
        { id: 'release-gate', status: 'block', exitCode: 3, stderr: '' },
        { id: 'dynamic-runtime', status: 'fail', exitCode: 1, stderr: 'Desktop calibration failed: unsafe external URL.' },
      ],
    },
    installerRequired: false,
  });

  assert.equal(summary.failedStep, 'dynamic-runtime');
  assert.equal(summary.exitCode, 1);
  assert.match(summary.errorExcerpt, /Desktop calibration failed/);
});

test('buildFailureMarkdown prints blocking finding rule, target and evidence', () => {
  const markdown = buildFailureMarkdown({
    repo: 'nutricionistaalmeidavh-spec/lojaonline',
    sha: 'abcdef1234567890',
    branch: 'feat/scan',
    pipelineUrl: 'https://ci.artisys.dev/repos/17/pipeline/98',
    summary: {
      failedStep: 'release-gate',
      exitCode: 3,
      reportStatus: 'fail',
      installerRequired: false,
      installerFound: false,
      gates: [{ id: 'release-gate', status: 'block', exitCode: 3 }],
      blockingFindings: [{
        severity: 'high',
        tool: 'gitleaks',
        ruleId: 'generic-api-key',
        message: 'Potential secret detected.',
        path: 'config/example.env',
        url: null,
        package: null,
        version: null,
        evidence: 'redacted fingerprint abc123',
        remediation: 'Remove the secret and rotate it.',
      }],
      errorExcerpt: 'release blocked',
    },
  });

  assert.match(markdown, /### Findings bloqueantes/);
  assert.match(markdown, /HIGH/);
  assert.match(markdown, /gitleaks\/generic-api-key/);
  assert.match(markdown, /config\/example\.env/);
  assert.match(markdown, /redacted fingerprint abc123/);
  assert.match(markdown, /Remove the secret and rotate it/);
});
