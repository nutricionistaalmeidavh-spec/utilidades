import test from 'node:test';
import assert from 'node:assert/strict';

async function safeImport(specifier) {
  try { return await import(specifier); } catch { return null; }
}

test('fixture registry resolves requested packs once in order', async () => {
  const mod = await safeImport('../src/fixture-registry.js');
  assert.ok(mod, 'fixture-registry.js must exist');
  assert.equal(typeof mod.createFixtureRegistry, 'function');
  assert.equal(typeof mod.resolveFixturePacks, 'function');

  const registry = mod.createFixtureRegistry([
    { id: 'common/base', revision: 1, data: { locale: 'pt-BR' } },
    { id: 'commerce/catalog', revision: 1, data: { products: [] } },
  ]);
  const packs = mod.resolveFixturePacks(registry, ['common/base', 'common/base', 'commerce/catalog']);
  assert.deepEqual(packs.map(pack => `${pack.id}@${pack.revision}`), ['common/base@1', 'commerce/catalog@1']);
});

test('built-in registry contains the initial reusable packs', async () => {
  const mod = await safeImport('../src/fixture-registry.js');
  assert.ok(mod, 'fixture-registry.js must exist');
  const registry = mod.createFixtureRegistry();
  for (const id of ['common/base', 'common/customer', 'common/employee', 'commerce/catalog', 'commerce/order']) {
    assert.ok(registry.has(id), `missing ${id}`);
  }
});
