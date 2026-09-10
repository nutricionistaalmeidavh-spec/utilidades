import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { generateClient } from '../src/index.mjs';

test('pinned real generator produces a type-checking TypeScript client', () => {
  const dir = mkdtempSync(join(tmpdir(), 'artisys-generated-'));
  try {
    generateClient(fileURLToPath(new URL('../examples/pos.openapi.json', import.meta.url)), dir);
    assert.ok(existsSync(join(dir, 'apis/DefaultApi.ts')));
    const require = createRequire(import.meta.url);
    const tsc = require.resolve('typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '--noEmit', '--strict', '--target', 'es2020', '--moduleResolution', 'node', join(dir, 'index.ts')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
