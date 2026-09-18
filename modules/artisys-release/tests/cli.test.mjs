import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, '..', 'bin', 'artisys-release.mjs');

test('CLI entrypoint actually executes main when launched by node', () => {
  const result = spawnSync(process.execPath, [cli, '--help'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: artisys-release/);
});
