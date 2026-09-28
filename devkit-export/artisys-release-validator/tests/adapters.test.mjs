import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

async function load(relative) {
  try {
    return await import(new URL(relative, import.meta.url));
  } catch (error) {
    assert.fail(`expected ${relative} to load: ${error.message}`);
  }
}

test('command adapter captures output, exit status and redacts secrets', async () => {
  const { runCommand } = await load('../src/adapters/command.mjs');
  const result = await runCommand({
    file: process.execPath,
    args: ['-e', "console.log('token=secret-value'); console.error('err secret-value')"],
    timeoutMs: 2000,
    redact: ['secret-value']
  });
  assert.equal(result.status, 'pass');
  assert.equal(result.code, 0);
  assert.match(result.stdout, /\[REDACTED\]/);
  assert.doesNotMatch(result.stdout + result.stderr, /secret-value/);
});

test('command adapter returns fail for non-zero exit and timeout without shell execution', async () => {
  const { runCommand } = await load('../src/adapters/command.mjs');
  const failed = await runCommand({ file: process.execPath, args: ['-e', 'process.exit(3)'], timeoutMs: 2000 });
  assert.equal(failed.status, 'fail');
  assert.equal(failed.code, 3);

  const timed = await runCommand({ file: process.execPath, args: ['-e', 'setTimeout(()=>{}, 5000)'], timeoutMs: 40 });
  assert.equal(timed.status, 'fail');
  assert.equal(timed.timedOut, true);
});

test('HTTP probe validates expected status on a local endpoint', async (t) => {
  const { probeHttp } = await load('../src/adapters/http.mjs');
  const server = http.createServer((_req, res) => {
    res.statusCode = 200;
    res.end('healthy');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { port } = server.address();
  const result = await probeHttp({ url: `http://127.0.0.1:${port}/health`, expectedStatus: [200], timeoutMs: 1000 });
  assert.equal(result.status, 'pass');
  assert.equal(result.httpStatus, 200);
  assert.match(result.body, /healthy/);
});

test('NSIS helpers build silent installer and uninstaller commands with argument arrays', async () => {
  const { createNsisInstallSpec, createNsisUninstallSpec } = await load('../src/adapters/nsis.mjs');
  const install = createNsisInstallSpec({ installer: 'C:\\build\\ArtiSys Setup.exe' });
  const uninstall = createNsisUninstallSpec({ uninstaller: 'C:\\Program Files\\ArtiSys\\Uninstall.exe' });
  assert.equal(install.file, 'C:\\build\\ArtiSys Setup.exe');
  assert.deepEqual(install.args, ['/S']);
  assert.equal(uninstall.file, 'C:\\Program Files\\ArtiSys\\Uninstall.exe');
  assert.deepEqual(uninstall.args, ['/S']);
  assert.equal('shell' in install, false);
});
