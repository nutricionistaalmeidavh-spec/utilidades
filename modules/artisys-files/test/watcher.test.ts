import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeWatchEvent } from '../src/watcher.js';

test('normalizeWatchEvent converts fs.watch events to workspace paths', () => {
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
