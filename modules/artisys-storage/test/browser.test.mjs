import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MemoryStorage, namespaceStorage, IndexedDbStorage } from '../src/browser.mjs';

test('browser memory storage and namespaces preserve portable storage semantics', async () => {
  const storage = new MemoryStorage();
  const scoped = namespaceStorage(storage, 'demo');
  await scoped.put('a', { value:1 }, { metadata:{ source:'test' } });
  assert.deepEqual(await scoped.get('a'), { value:{ value:1 }, metadata:{ source:'test' } });
  assert.deepEqual(await scoped.list(), ['a']);
  assert.equal(await scoped.delete('a'), true);
  assert.equal(await scoped.get('a'), null);
});

test('IndexedDbStorage requires an IndexedDB implementation and browser source is Node-free', async () => {
  assert.throws(() => new IndexedDbStorage({ indexedDB:null }), /IndexedDB is required/);
  const source = await readFile(new URL('../src/browser.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /(?:from|import\()\s*['"]node:/);
  assert.doesNotMatch(source, /node:sqlite/);
});
