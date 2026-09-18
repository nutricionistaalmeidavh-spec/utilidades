import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runBoundedNodeTestFile } from '../src/bounded-test-runner.js';

test('bounded runner streams a passing node test and returns success', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-bounded-pass-'));
  const file = path.join(root, 'pass.test.js');
  await fs.writeFile(file, "const test=require('node:test'); test('ok',()=>{});\n");
  const chunks = [];
  const result = await runBoundedNodeTestFile({
    file,
    timeoutMs: 1000,
    cwd: root,
    onStdout: chunk => chunks.push(String(chunk)),
  });
  assert.equal(result.timedOut, false);
  assert.equal(result.exitCode, 0);
  assert.match(chunks.join(''), /ok 1 - ok/);
});

test('bounded runner terminates a hung node test at the configured timeout', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-bounded-timeout-'));
  const file = path.join(root, 'hang.test.js');
  await fs.writeFile(file, "const test=require('node:test'); test('hang',()=>{}); setInterval(()=>{},1000);\n");
  const started = Date.now();
  const result = await runBoundedNodeTestFile({
    file,
    timeoutMs: 150,
    cwd: root,
    onStdout: () => {},
    onStderr: () => {},
  });
  assert.equal(result.timedOut, true);
  assert.ok(Date.now() - started < 2000);
});
