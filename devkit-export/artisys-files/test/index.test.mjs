import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  WorkspaceIndex,
  applyDrop,
  createStorageBridge,
  createWorkspace,
  normalizeWatchEvent,
  resolveInsideRoot,
  version,
} from '../src/index.mjs';

async function withTempWorkspace(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artisys-files-'));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('path guard rejects absolute paths and parent traversal', () => {
  const root = path.join(os.tmpdir(), 'artisys-files-root');
  assert.throws(() => resolveInsideRoot(root, path.resolve(root, 'absolute.txt')), { code: 'ABSOLUTE_PATH' });
  assert.throws(() => resolveInsideRoot(root, '../outside.txt'), { code: 'PATH_TRAVERSAL' });
  assert.equal(resolveInsideRoot(root, 'docs/report.pdf'), path.join(path.resolve(root), 'docs', 'report.pdf'));
});

test('workspace mirrors create, write, rename, copy, move and remove on disk', async () => {
  await withTempWorkspace(async (root) => {
    const workspace = await createWorkspace(root);
    await workspace.createDirectory('docs');
    await workspace.writeFile('docs/a.txt', 'alpha');
    assert.equal(await readFile(path.join(root, 'docs', 'a.txt'), 'utf8'), 'alpha');

    assert.equal(await workspace.rename('docs/a.txt', 'b.txt'), 'docs/b.txt');
    await workspace.copy('docs/b.txt', 'copy/b.txt');
    await workspace.move('copy/b.txt', 'docs/c.txt');

    const tree = await workspace.listTree();
    const docs = tree.children.find((entry) => entry.path === 'docs');
    assert.equal(docs.type, 'directory');
    assert.deepEqual(docs.children.map((entry) => entry.name), ['b.txt', 'c.txt']);

    await workspace.remove('docs/c.txt');
    await assert.rejects(() => workspace.remove(''), { code: 'ROOT_DELETE_BLOCKED' });
  });
});

test('workspace refuses destination overwrite and moving a directory into itself', async () => {
  await withTempWorkspace(async (root) => {
    const workspace = await createWorkspace(root);
    await workspace.writeFile('source/file.txt', 'one');
    await workspace.writeFile('target/file.txt', 'two');

    await assert.rejects(
      () => applyDrop(workspace, { sourcePath: 'source/file.txt', targetDirectory: 'target' }),
      { code: 'DESTINATION_EXISTS' },
    );
    assert.equal(await readFile(path.join(root, 'target', 'file.txt'), 'utf8'), 'two');

    await assert.rejects(() => workspace.move('source', 'source/nested/source'), {
      code: 'DESTINATION_INSIDE_SOURCE',
    });
  });
});

test('drag-and-drop supports move and copy and validates input', async () => {
  await withTempWorkspace(async (root) => {
    const workspace = await createWorkspace(root);
    await workspace.writeFile('inbox/move.txt', 'move');
    await workspace.writeFile('copy.txt', 'copy');
    await workspace.createDirectory('docs');

    assert.equal(await applyDrop(workspace, { sourcePath: 'inbox/move.txt', targetDirectory: 'docs' }), 'docs/move.txt');
    assert.equal(await applyDrop(workspace, { sourcePath: 'copy.txt', targetDirectory: 'docs', mode: 'copy' }), 'docs/copy.txt');
    assert.equal(await readFile(path.join(root, 'docs', 'move.txt'), 'utf8'), 'move');
    assert.equal(await readFile(path.join(root, 'copy.txt'), 'utf8'), 'copy');
    assert.equal(await readFile(path.join(root, 'docs', 'copy.txt'), 'utf8'), 'copy');

    await assert.rejects(() => applyDrop(workspace, { targetDirectory: 'docs' }), { code: 'INVALID_DROP_SOURCE' });
    await assert.rejects(
      () => applyDrop(workspace, { sourcePath: 'copy.txt', targetDirectory: 'docs', mode: 'invalid' }),
      { code: 'INVALID_DROP_MODE' },
    );
  });
});

test('tree does not follow symbolic links and file operations reject traversal through them', async (t) => {
  await withTempWorkspace(async (root) => {
    const outside = await mkdtemp(path.join(os.tmpdir(), 'artisys-files-outside-'));
    try {
      let symlinkCreated = true;
      try {
        await symlink(outside, path.join(root, 'external'), process.platform === 'win32' ? 'junction' : 'dir');
      } catch (error) {
        if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) {
          symlinkCreated = false;
          t.skip('Symlink creation is not permitted on this Windows environment');
        } else {
          throw error;
        }
      }
      if (!symlinkCreated) return;

      const workspace = await createWorkspace(root);
      const tree = await workspace.listTree();
      assert.equal(tree.children.find((entry) => entry.name === 'external')?.type, 'symlink');
      await assert.rejects(() => workspace.writeFile('external/escape.txt', 'blocked'), { code: 'SYMLINK_NOT_ALLOWED' });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test('WorkspaceIndex searches name, path, extension and type', async () => {
  await withTempWorkspace(async (root) => {
    const workspace = await createWorkspace(root);
    await workspace.writeFile('finance/budget.csv', '1');
    await workspace.writeFile('docs/report.pdf', '2');
    const index = new WorkspaceIndex().rebuild(await workspace.listTree());

    assert.deepEqual(index.search('budget').map((entry) => entry.path), ['finance/budget.csv']);
    assert.deepEqual(index.search('docs pdf').map((entry) => entry.path), ['docs/report.pdf']);
    assert.ok(index.search('directory').some((entry) => entry.path === 'docs'));
  });
});

test('watcher event normalization stays relative to the workspace', () => {
  const root = path.join(os.tmpdir(), 'artisys-files-watch');
  assert.deepEqual(normalizeWatchEvent(root, 'change', path.join('docs', 'file.txt')), {
    kind: 'changed',
    path: 'docs/file.txt',
  });
  assert.deepEqual(normalizeWatchEvent(root, 'rename', 'renamed.txt'), {
    kind: 'renamed',
    path: 'renamed.txt',
  });
  assert.equal(normalizeWatchEvent(root, 'change', null), null);
});

test('storage bridge is optional, namespace-aware and compatible with artisys-storage options', async () => {
  const calls = [];
  const storage = {
    async put(key, value, options) { calls.push(['put', key, value, options]); },
    async get(key) { calls.push(['get', key]); return { value: 'ok' }; },
    async delete(key) { calls.push(['delete', key]); },
    async list(prefix) { calls.push(['list', prefix]); return []; },
  };
  const bridge = createStorageBridge(storage, 'workspace-a');
  await bridge.put('docs/a.txt', 'x', { mime: 'text/plain' });
  await bridge.get('docs/a.txt');
  await bridge.delete('docs/a.txt');
  await bridge.list('docs');

  assert.deepEqual(calls.map((item) => item[1]), [
    'workspace-a/docs/a.txt',
    'workspace-a/docs/a.txt',
    'workspace-a/docs/a.txt',
    'workspace-a/docs',
  ]);
  assert.deepEqual(calls[0][3], { metadata: { mime: 'text/plain' } });
});

test('module exposes a version', () => {
  assert.equal(version, '0.1.0');
});
