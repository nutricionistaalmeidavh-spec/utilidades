import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyDrop } from '../src/drag-drop.js';
import { createWorkspace } from '../src/workspace.js';

test('applyDrop moves a file into the target directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artisys-files-drop-'));
  try {
    const workspace = await createWorkspace(root);
    await workspace.writeFile('inbox/file.txt', 'content');
    await workspace.createDirectory('docs');

    const result = await applyDrop(workspace, {
      sourcePath: 'inbox/file.txt',
      targetDirectory: 'docs',
    });

    assert.equal(result, 'docs/file.txt');
    assert.equal(await readFile(path.join(root, 'docs', 'file.txt'), 'utf8'), 'content');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('applyDrop can copy instead of moving', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artisys-files-drop-'));
  try {
    const workspace = await createWorkspace(root);
    await workspace.writeFile('file.txt', 'content');
    await workspace.createDirectory('copies');

    await applyDrop(workspace, { sourcePath: 'file.txt', targetDirectory: 'copies', mode: 'copy' });
    assert.equal(await readFile(path.join(root, 'file.txt'), 'utf8'), 'content');
    assert.equal(await readFile(path.join(root, 'copies', 'file.txt'), 'utf8'), 'content');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
