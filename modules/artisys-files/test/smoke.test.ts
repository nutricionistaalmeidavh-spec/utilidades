import assert from 'node:assert/strict';
import test from 'node:test';
import * as api from '../src/index.js';

test('public API exports workspace building blocks', () => {
  assert.equal(typeof api.createWorkspace, 'function');
  assert.equal(typeof api.applyDrop, 'function');
  assert.equal(typeof api.WorkspaceIndex, 'function');
  assert.equal(typeof api.watchWorkspace, 'function');
});
