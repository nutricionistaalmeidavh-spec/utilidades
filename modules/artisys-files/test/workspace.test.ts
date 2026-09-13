import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createWorkspace } from '../src/workspace.js';

async function withWorkspace(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artisys-files-'));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('workspace mirrors file and directory operations on disk', async () => {
  await withWorkspace(async (root) => {
    const workspace = await createWorkspace(root);
    await workspace.createDirectory('docs');
    await workspace.writeFile('docs/a.txt', 'alpha');
    assert.equal(await readFile(path.join(root, 'docs', 'a.txt'), 'utf8'), 'alpha');

    const renamed = await workspace.rename('docs/a.txt', 'b.txt');
    assert.equal(renamed, 'docs/b.txt');

    await workspace.copy('docs/b.txt', 'copy/b.txt');
    await workspace.move('copy/b.txt', 'docs/c.txt');

    const tree = await workspace.listTree();
    const docs = tree.children.find((entry) => entry.path === 'docs');
    assert.ok(docs && docs.type === 'directory' && 'children' in docs);
    if (docs && docs.type === 'directory' && 'children' in docs) {
      assert.deepEqual(docs.children.map((entry) => entry.name), ['b.txt', 'c.txt']);
    }

    await workspace.remove('docs/c.txt');
  });
});

test('workspace blocks traversal and root deletion', async () => {
  await withWorkspace(async (root) => {
    const workspace = await createWorkspace(root);
    await assert.rejects(() => workspace.writeFile('../outside.txt', 'no'));
    await assert.rejects(() => workspace.remove(''));
  });
});
