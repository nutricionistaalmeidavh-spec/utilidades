import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeRelease,
  publicPipelineUrl,
  buildFailureMarkdown,
  publishGitHubFailure,
} from '../src/index.mjs';

test('summarizeRelease extracts release failure details and installer', () => {
  const report = {
    status: 'blocked',
    failedStep: 'qa',
    steps: [
      { id: 'installer', status: 'pass', exitCode: 0, stdout: 'installer ok', stderr: '' },
      { id: 'qa', status: 'fail', exitCode: 1, command: 'npm run qa:full', stdout: 'Running tests', stderr: 'Expected 200\nReceived 500' },
    ],
  };

  const summary = summarizeRelease({
    report,
    logText: 'fallback log',
    installerPaths: ['dist/App-Setup.exe'],
  });

  assert.equal(summary.failedStep, 'qa');
  assert.equal(summary.exitCode, 1);
  assert.equal(summary.command, 'npm run qa:full');
  assert.match(summary.errorExcerpt, /Received 500/);
  assert.equal(summary.installerFound, true);
  assert.equal(summary.installerPath, 'dist/App-Setup.exe');
});

test('summarizeRelease survives missing workspace/report and labels early failure', () => {
  const summary = summarizeRelease({
    report: null,
    logText: '',
    installerPaths: [],
    fallbackStep: 'clone-or-workflow',
    fallbackMessage: 'Pipeline failed before workspace became available.',
  });

  assert.equal(summary.failedStep, 'clone-or-workflow');
  assert.equal(summary.exitCode, null);
  assert.match(summary.errorExcerpt, /before workspace/);
  assert.equal(summary.installerFound, false);
});

test('publicPipelineUrl maps local Woodpecker link to public CI', () => {
  assert.equal(
    publicPipelineUrl('http://localhost:8000/repos/1/pipeline/29/1'),
    'https://ci.artisys.dev/repos/1/pipeline/29/1',
  );
});

test('buildFailureMarkdown is product-generic', () => {
  const markdown = buildFailureMarkdown({
    repo: 'nutricionistaalmeidavh-spec/OficinaAgricola',
    sha: 'abcdef1234567890',
    branch: 'main',
    pipelineUrl: 'https://ci.artisys.dev/repos/2/pipeline/1/1',
    summary: {
      failedStep: 'installer',
      exitCode: 1,
      installerFound: false,
      installerPath: null,
      command: 'npm run dist:win',
      errorExcerpt: 'NSIS failed',
    },
  });

  assert.match(markdown, /OficinaAgricola — Woodpecker falhou/);
  assert.match(markdown, /Step: `installer`/);
  assert.doesNotMatch(markdown, /PDV ArtiSys/);
});

test('publishGitHubFailure uses caller-provided status context and keeps PR reporting optional', async () => {
  const calls = [];
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/pulls?')) {
      return { ok: true, status: 200, json: async () => [{ number: 7 }], text: async () => '' };
    }
    return { ok: true, status: 201, json: async () => ({}), text: async () => '' };
  };

  const result = await publishGitHubFailure({
    token: 'secret',
    repo: 'nutricionistaalmeidavh-spec/OficinaAgricola',
    sha: 'abcdef1234567890',
    branch: 'main',
    pipelineUrl: 'http://localhost:8000/repos/2/pipeline/1/1',
    statusContext: 'ci/woodpecker/oficina-release-detail',
    summary: {
      failedStep: 'build',
      exitCode: 1,
      installerFound: false,
      installerPath: null,
      command: 'npm run build',
      errorExcerpt: 'build failed',
    },
    fetchImpl: fakeFetch,
  });

  assert.equal(result.prNumber, 7);
  const statusCall = calls.find((call) => call.url.endsWith('/statuses/abcdef1234567890'));
  assert.ok(statusCall);
  const body = JSON.parse(statusCall.options.body);
  assert.equal(body.context, 'ci/woodpecker/oficina-release-detail');
  assert.ok(calls.some((call) => call.url.endsWith('/commits/abcdef1234567890/comments')));
  assert.ok(calls.some((call) => call.url.endsWith('/issues/7/comments')));
});
