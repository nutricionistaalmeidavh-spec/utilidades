import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeRelease,
  publicPipelineUrl,
  buildFailureMarkdown,
  buildSuccessMarkdown,
  publishGitHubFailure,
  publishGitHubSuccess,
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
  const summary = summarizeRelease({ report, logText: 'fallback log', installerPaths: ['dist/App-Setup.exe'] });
  assert.equal(summary.failedStep, 'qa');
  assert.equal(summary.exitCode, 1);
  assert.equal(summary.command, 'npm run qa:full');
  assert.match(summary.errorExcerpt, /Received 500/);
  assert.equal(summary.installerFound, true);
  assert.equal(summary.installerPath, 'dist/App-Setup.exe');
  assert.deepEqual(summary.gates, [{id:'installer',status:'pass',exitCode:0},{id:'qa',status:'fail',exitCode:1}]);
});

test('summarizeRelease attaches structured QA failure details', () => {
  const qaReport = {
    status: 'FAIL',
    counts: { flowsPassed: 25, flowsFailed: 1 },
    flows: [
      { flow: '17-relatorios-vendedor', status: 'PASS' },
      {
        flow: '18-comissao-vendedor',
        status: 'FAIL',
        error: 'QA flow failed: pdv-artisys/18-comissao-vendedor',
        outputDir: 'qa-artifacts/run-18',
        summary: {
          flow: '18-comissao-vendedor',
          steps: [
            { name: 'Abrir relatório de comissão', action: 'click', status: 'passed' },
            { name: 'Validar total de comissão', action: 'assertText', status: 'failed', error: 'Expected R$ 12,00, received R$ 0,00' },
          ],
          failure: { message: 'Expected R$ 12,00, received R$ 0,00' },
        },
      },
    ],
  };
  const summary = summarizeRelease({
    report: { status: 'blocked', failedStep: 'qa', steps: [{ id: 'qa', status: 'fail', exitCode: 1, stderr: 'wrapper failed' }] },
    qaReport,
    installerPaths: ['dist/App-Setup.exe'],
  });
  assert.equal(summary.qa.total, 26);
  assert.equal(summary.qa.passed, 25);
  assert.equal(summary.qa.failed, 1);
  assert.equal(summary.qa.failures[0].flow, '18-comissao-vendedor');
  assert.equal(summary.qa.failures[0].step, 'Validar total de comissão');
  assert.match(summary.qa.failures[0].error, /R\$ 12,00/);
  assert.match(summary.qa.failures[0].screenshot, /failure\.png$/);
  assert.match(summary.errorExcerpt, /QA 25\/26 PASS/);
});

test('summarizeRelease survives missing workspace/report and labels early failure', () => {
  const summary = summarizeRelease({ report: null, logText: '', installerPaths: [], fallbackStep: 'clone-or-workflow', fallbackMessage: 'Pipeline failed before workspace became available.' });
  assert.equal(summary.failedStep, 'clone-or-workflow');
  assert.equal(summary.exitCode, null);
  assert.match(summary.errorExcerpt, /before workspace/);
  assert.equal(summary.installerFound, false);
});

test('summarizeRelease removes NUL bytes produced by Windows PowerShell UTF-16 logs', () => {
  const summary = summarizeRelease({ report: null, logText: 'n\u0000p\u0000m\u0000 \u0000E\u0000R\u0000R\u0000!\u0000', installerPaths: [] });
  assert.equal(summary.errorExcerpt, 'npm ERR!');
});

test('publicPipelineUrl maps local Woodpecker link to public CI', () => {
  assert.equal(publicPipelineUrl('http://localhost:8000/repos/1/pipeline/29/1'),'https://ci.artisys.dev/repos/1/pipeline/29/1');
});

test('buildFailureMarkdown is product-generic and lists gates', () => {
  const markdown = buildFailureMarkdown({
    repo: 'nutricionistaalmeidavh-spec/OficinaAgricola', sha: 'abcdef1234567890', branch: 'main', pipelineUrl: 'https://ci.artisys.dev/repos/2/pipeline/1/1',
    summary: { failedStep: 'installer', exitCode: 1, installerFound: false, installerPath: null, command: 'npm run dist:win', errorExcerpt: 'NSIS failed', gates:[{id:'build',status:'pass',exitCode:0},{id:'installer',status:'fail',exitCode:1}] },
  });
  assert.match(markdown, /OficinaAgricola — Woodpecker falhou/);
  assert.match(markdown, /Step: `installer`/);
  assert.match(markdown, /build: pass/);
  assert.doesNotMatch(markdown, /PDV ArtiSys/);
});

test('buildFailureMarkdown includes QA flow, failed step and evidence paths', () => {
  const markdown = buildFailureMarkdown({
    repo: 'nutricionistaalmeidavh-spec/PDV-ARTISYS',
    sha: 'abcdef1234567890',
    branch: 'feat/qa',
    pipelineUrl: 'https://ci.artisys.dev/repos/1/pipeline/95/1',
    summary: {
      failedStep: 'qa',
      exitCode: 1,
      installerFound: true,
      installerPath: 'dist/ArtiSys-PDV-1.3.4-x64-Setup.exe',
      command: 'powershell scripts/qa-release-full.ps1',
      errorExcerpt: 'QA 25/26 PASS',
      gates: [{ id: 'qa', status: 'fail', exitCode: 1 }],
      qa: {
        passed: 25,
        failed: 1,
        total: 26,
        failures: [{
          flow: '18-comissao-vendedor',
          step: 'Validar total de comissão',
          error: 'Expected R$ 12,00, received R$ 0,00',
          screenshot: 'qa-artifacts/run-18/screenshots/failure.png',
          trace: 'qa-artifacts/run-18/trace.zip',
          runSummary: 'qa-artifacts/run-18/run-summary.json',
        }],
      },
    },
  });
  assert.match(markdown, /### QA detalhado/);
  assert.match(markdown, /25\/26 PASS/);
  assert.match(markdown, /18-comissao-vendedor/);
  assert.match(markdown, /Validar total de comissão/);
  assert.match(markdown, /failure\.png/);
  assert.match(markdown, /trace\.zip/);
});

test('buildSuccessMarkdown is product-generic', () => {
  const markdown = buildSuccessMarkdown({ repo:'nutricionistaalmeidavh-spec/PDV-ARTISYS',sha:'abcdef123456',branch:'main',pipelineUrl:'http://localhost:8000/repos/1/pipeline/40/1',summary:{installerFound:true,installerPath:'dist/app.exe',gates:[{id:'qa',status:'pass',exitCode:0},{id:'security',status:'pass',exitCode:0}]}});
  assert.match(markdown,/PDV-ARTISYS — Woodpecker aprovado/);
  assert.match(markdown,/qa: pass/);
  assert.match(markdown,/security: pass/);
});

test('publishGitHubFailure uses caller-provided status context and keeps PR reporting optional', async () => {
  const calls = [];
  const fakeFetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/pulls?')) return { ok: true, status: 200, json: async () => [{ number: 7 }], text: async () => '' };
    return { ok: true, status: 201, json: async () => ({}), text: async () => '' };
  };
  const result = await publishGitHubFailure({
    token: 'secret', repo: 'nutricionistaalmeidavh-spec/OficinaAgricola', sha: 'abcdef1234567890', branch: 'main', pipelineUrl: 'http://localhost:8000/repos/2/pipeline/1/1', statusContext: 'ci/woodpecker/oficina-release-detail',
    summary: { failedStep: 'build', exitCode: 1, installerFound: false, installerPath: null, command: 'npm run build', errorExcerpt: 'build failed', gates:[] }, fetchImpl: fakeFetch,
  });
  assert.equal(result.prNumber, 7);
  const statusCall = calls.find((call) => call.url.endsWith('/statuses/abcdef1234567890'));
  assert.ok(statusCall);
  const body = JSON.parse(statusCall.options.body);
  assert.equal(body.context, 'ci/woodpecker/oficina-release-detail');
  assert.ok(calls.some((call) => call.url.endsWith('/commits/abcdef1234567890/comments')));
  assert.ok(calls.some((call) => call.url.endsWith('/issues/7/comments')));
});

test('publishGitHubSuccess can publish status without comment spam', async () => {
  const calls=[];
  const fakeFetch=async (url,options={})=>{ calls.push({url:String(url),options}); return {ok:true,status:201,json:async()=>({}),text:async()=>''}; };
  await publishGitHubSuccess({token:'secret',repo:'o/r',sha:'abcdef',branch:'main',pipelineUrl:'http://localhost:8000/repos/1/pipeline/1/1',statusContext:'ci/woodpecker/release-detail',summary:{installerFound:true,installerPath:'dist/app.exe',gates:[]},comment:false,fetchImpl:fakeFetch});
  const statusCall=calls.find((call)=>call.url.endsWith('/statuses/abcdef'));
  assert.ok(statusCall);
  assert.equal(JSON.parse(statusCall.options.body).state,'success');
  assert.equal(calls.some((call)=>call.url.includes('/comments')),false);
});
