#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBoundedNodeTestFile } from '../src/bounded-test-runner.js';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(moduleRoot, 'tests');
const timeoutMs = Number(process.env.ARTISYS_QA_TEST_TIMEOUT_MS || 90_000);
const timeoutLabel = `${Math.round(timeoutMs / 1000)}s`;

const files = (await fs.readdir(testsDir))
  .filter(name => name.endsWith('.test.js'))
  .sort();

if (!files.length) {
  console.error('[QA tests] Nenhum arquivo tests/*.test.js encontrado.');
  process.exit(1);
}

console.log(`[QA tests] ${files.length} arquivo(s); timeout por arquivo: ${timeoutLabel}`);

let failed = null;
for (let index = 0; index < files.length; index += 1) {
  const name = files[index];
  const file = path.join(testsDir, name);
  console.log(`\n[QA tests] ${index + 1}/${files.length} START ${name}`);
  const result = await runBoundedNodeTestFile({ file, timeoutMs, cwd: moduleRoot });
  const seconds = (result.durationMs / 1000).toFixed(2);

  if (result.timedOut) {
    failed = result;
    console.error(`\n[QA tests] TIMEOUT ${name} apos ${seconds}s (limite ${timeoutLabel}).`);
    break;
  }
  if (result.exitCode !== 0) {
    failed = result;
    console.error(`\n[QA tests] FAIL ${name} exit=${result.exitCode} duracao=${seconds}s.`);
    break;
  }
  console.log(`[QA tests] PASS ${name} ${seconds}s`);
}

if (failed) {
  const exitCode = failed.timedOut ? 124 : (failed.exitCode || 1);
  console.error(`[QA tests] Suite interrompida em ${path.basename(failed.file)}.`);
  process.exit(exitCode);
}

console.log(`\n[QA tests] PASS ${files.length}/${files.length} arquivos.`);
