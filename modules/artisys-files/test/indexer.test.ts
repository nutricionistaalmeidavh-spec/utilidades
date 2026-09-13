import assert from 'node:assert/strict';
import test from 'node:test';
import { WorkspaceIndex } from '../src/indexer.js';
import type { WorkspaceTree } from '../src/types.js';

const tree: WorkspaceTree = {
  name: 'root',
  path: '',
  type: 'directory',
  children: [
    { name: 'budget.csv', path: 'finance/budget.csv', type: 'file', extension: 'csv', size: 10 },
    {
      name: 'docs',
      path: 'docs',
      type: 'directory',
      children: [{ name: 'report.pdf', path: 'docs/report.pdf', type: 'file', extension: 'pdf', size: 20 }],
    },
  ],
};

test('WorkspaceIndex searches by name, path, extension and type', () => {
  const index = new WorkspaceIndex();
  index.rebuild(tree);

  assert.deepEqual(index.search('budget').map((item) => item.path), ['finance/budget.csv']);
  assert.deepEqual(index.search('docs pdf').map((item) => item.path), ['docs/report.pdf']);
  assert.deepEqual(index.search('directory').map((item) => item.path), ['docs']);
});
