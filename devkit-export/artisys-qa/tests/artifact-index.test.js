import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanQaArtifacts } from '../src/artifact-index.js';

test('indexes supported QA artifacts recursively and skips symlinks', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-artifacts-'));
  const run = path.join(root, 'pdv', 'bridge', 'job-1');
  await fs.mkdir(path.join(run, 'screens'), { recursive: true });
  await fs.writeFile(path.join(run, 'screens', 'step-01.png'), 'abc');
  await fs.writeFile(path.join(run, 'run.webm'), 'video');
  await fs.writeFile(path.join(run, 'report.json'), '{}');
  await fs.writeFile(path.join(run, 'ignore.exe'), 'x');
  try { await fs.symlink(path.join(root, 'outside.txt'), path.join(run, 'screens', 'escape.png')); } catch {}
  const items = await scanQaArtifacts({ artifactRoot: root, runDir: run });
  assert.deepEqual(items.map(x => x.type).sort(), ['report', 'screenshot', 'video']);
  assert.equal(items.every(x => x.localPath.startsWith(root)), true);
});

test('rejects run directories outside artifact root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-artifacts-'));
  await assert.rejects(() => scanQaArtifacts({ artifactRoot: root, runDir: path.resolve(root, '..') }), /outside/i);
});
