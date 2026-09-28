import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

async function load(relative) {
  try {
    return await import(new URL(relative, import.meta.url));
  } catch (error) {
    assert.fail(`expected ${relative} to load: ${error.message}`);
  }
}

function runNode(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

test('sha256File hashes the exact artifact bytes', async () => {
  const { sha256File } = await load('../src/artifact.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'artisys-validator-hash-'));
  const artifact = path.join(dir, 'artifact.bin');
  await writeFile(artifact, 'fixture');
  const expected = createHash('sha256').update('fixture').digest('hex');
  assert.equal(await sha256File(artifact), expected);
});

test('report writer stores JSON as source of truth and escapes HTML', async () => {
  const { writeValidationReports } = await load('../src/report.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'artisys-validator-report-'));
  const result = {
    status: 'APPROVED', product: '<Demo & Product>', version: '1.0.0',
    artifact: { path: 'demo.exe', sha256: 'abc' },
    startedAt: '2026-09-11T00:00:00.000Z', finishedAt: '2026-09-11T00:00:01.000Z', durationMs: 1000,
    phases: [{ id: 'boot', required: true, status: 'pass', attempts: 1, durationMs: 10 }], failedRequired: []
  };
  const files = await writeValidationReports(result, dir);
  const json = JSON.parse(await readFile(files.jsonPath, 'utf8'));
  const html = await readFile(files.htmlPath, 'utf8');
  assert.deepEqual(json, result);
  assert.match(html, /APPROVED/);
  assert.match(html, /&lt;Demo &amp; Product&gt;/);
  assert.doesNotMatch(html, /<Demo & Product>/);
});

test('CLI executes declarative phases, writes reports and exits 0 only when approved', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dir = await mkdtemp(path.join(os.tmpdir(), 'artisys-validator-cli-'));
  const artifact = path.join(dir, 'demo.exe');
  const reportDir = path.join(dir, 'reports');
  await writeFile(artifact, 'artifact');
  const config = path.join(dir, 'profile.mjs');
  await writeFile(config, `export default {
    profile: {
      schemaVersion: 1,
      product: 'CLI Demo',
      version: '1.0.0',
      artifact: ${JSON.stringify(artifact)},
      workspace: ${JSON.stringify(dir)},
      reportDir: ${JSON.stringify(reportDir)},
      phases: [{ id: 'smoke', action: { type: 'command', file: process.execPath, args: ['-e', 'process.exit(0)'] } }]
    }
  };\n`);
  const cli = path.join(root, 'bin', 'artisys-release-validator.mjs');
  const ok = await runNode([cli, config], root);
  assert.equal(ok.code, 0, ok.stderr);
  assert.match(ok.stdout, /APPROVED/);
  await access(path.join(reportDir, 'validation-report.json'));
  await access(path.join(reportDir, 'validation-report.html'));

  const blockedConfig = path.join(dir, 'blocked.mjs');
  await writeFile(blockedConfig, `export default {
    profile: {
      schemaVersion: 1,
      product: 'CLI Demo',
      version: '1.0.1',
      artifact: ${JSON.stringify(artifact)},
      workspace: ${JSON.stringify(dir)},
      reportDir: ${JSON.stringify(path.join(dir, 'blocked-reports'))},
      phases: [{ id: 'smoke', action: { type: 'command', file: process.execPath, args: ['-e', 'process.exit(7)'] } }]
    }
  };\n`);
  const blocked = await runNode([cli, blockedConfig], root);
  assert.equal(blocked.code, 1);
  assert.match(blocked.stdout, /BLOCKED/);
});
