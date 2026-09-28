import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWorkspace } from '../src/index.mjs';

test('node workspace reads a file written through the workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artisys-files-node-read-'));
  try {
    const files = await createWorkspace(root);
    await files.writeFile('clients/acme/report.txt', 'conteudo');
    assert.equal(await files.readFile('clients/acme/report.txt', 'utf8'), 'conteudo');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
