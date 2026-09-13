import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveInsideRoot, toWorkspacePath } from '../src/path-guard.js';

test('resolveInsideRoot accepts nested relative paths', () => {
  const root = path.join(os.tmpdir(), 'artisys-files-root');
  assert.equal(
    resolveInsideRoot(root, 'docs/report.pdf'),
    path.join(path.resolve(root), 'docs', 'report.pdf'),
  );
});

test('resolveInsideRoot rejects absolute paths', () => {
  const root = path.join(os.tmpdir(), 'artisys-files-root');
  assert.throws(() => resolveInsideRoot(root, path.resolve(root, 'outside.txt')));
});

test('resolveInsideRoot rejects parent traversal', () => {
  const root = path.join(os.tmpdir(), 'artisys-files-root');
  assert.throws(() => resolveInsideRoot(root, '../outside.txt'));
});

test('toWorkspacePath rejects paths outside root', () => {
  const root = path.join(os.tmpdir(), 'artisys-files-root');
  assert.throws(() => toWorkspacePath(root, path.resolve(root, '..', 'outside.txt')));
});
