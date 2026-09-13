import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SqliteStorage, namespaceStorage } from '../src/index.mjs';

test('SqliteStorage survives close and reopen with metadata', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'artisys-storage-'));
  const file = join(dir, 'storage.sqlite');
  try {
    let store = new SqliteStorage({ filePath: file });
    await store.put('customers/1', { name: 'Ana' }, { metadata: { kind: 'customer' } });
    await store.close();

    store = new SqliteStorage({ filePath: file });
    const entry = await store.get('customers/1');
    assert.deepEqual(entry.value, { name: 'Ana' });
    assert.deepEqual(entry.metadata, { kind: 'customer' });
    assert.deepEqual(await store.list('customers/'), ['customers/1']);
    await store.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('SqliteStorage supports namespace isolation and delete', async () => {
  const store = new SqliteStorage({ filePath: ':memory:' });
  const a = namespaceStorage(store, 'a');
  const b = namespaceStorage(store, 'b');
  await a.put('x', '1');
  await b.put('x', '2');
  assert.equal((await a.get('x')).value, '1');
  assert.equal((await b.get('x')).value, '2');
  assert.equal(await a.delete('x'), true);
  assert.equal(await a.get('x'), null);
  assert.equal((await b.get('x')).value, '2');
  assert.equal((await store.health()).ok, true);
  await store.close();
});
