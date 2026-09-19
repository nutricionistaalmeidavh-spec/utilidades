import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

test('utilidades Woodpecker clone skips curated upstream submodules', async () => {
  const workflow = await fs.readFile(path.join(repoRoot, '.woodpecker/artisys-release.yaml'), 'utf8');

  assert.match(workflow, /clone:\s*[\r\n]+\s+git:/);
  assert.match(workflow, /image:\s*woodpeckerci\/plugin-git/);
  assert.match(workflow, /recursive:\s*false/);
});
