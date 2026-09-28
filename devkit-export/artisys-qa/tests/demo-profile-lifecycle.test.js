import test from 'node:test';
import assert from 'node:assert/strict';

async function safeImport(specifier) {
  try { return await import(specifier); } catch { return null; }
}

const profile = {
  name: 'default',
  account: { createIfMissing: true, usernameEnv: 'DEMO_USER', passwordEnv: 'DEMO_PASS' },
  workspace: { strategy: 'persistent', resetBeforeRun: null },
  fixtures: [],
};

const env = { DEMO_USER: 'demo@example.test', DEMO_PASS: 'secret-value' };

test('prepare creates demo account only once and reuses it', async () => {
  const mod = await safeImport('../src/demo-profile.js');
  assert.ok(mod, 'demo-profile.js must exist');
  assert.equal(typeof mod.prepareDemoProfile, 'function');

  let exists = false;
  let creates = 0;
  const adapter = {
    findDemoAccount: async () => exists ? { id: 'demo-1', demo: true } : null,
    createDemoAccount: async () => { creates += 1; exists = true; return { id: 'demo-1', demo: true }; },
    authenticateDemoAccount: async () => ({ ok: true }),
    ensureDemoWorkspace: async () => ({ id: 'ws-1', demo: true }),
  };

  const first = await mod.prepareDemoProfile({ profile, adapter, env, context: {} });
  const second = await mod.prepareDemoProfile({ profile, adapter, env, context: {} });

  assert.equal(creates, 1);
  assert.equal(first.accountCreated, true);
  assert.equal(second.accountCreated, false);
});

test('destructive reset refuses workspace not explicitly marked demo', async () => {
  const mod = await safeImport('../src/demo-profile.js');
  assert.ok(mod, 'demo-profile.js must exist');
  const adapter = {
    findDemoAccount: async () => ({ id: 'demo-1', demo: true }),
    authenticateDemoAccount: async () => ({ ok: true }),
    ensureDemoWorkspace: async () => ({ id: 'ws-real', demo: false }),
    resetDemoWorkspace: async () => {},
  };
  const resetProfile = { ...profile, workspace: { strategy: 'persistent', resetBeforeRun: 'baseline' } };
  await assert.rejects(
    mod.prepareDemoProfile({ profile: resetProfile, adapter, env, context: {} }),
    /refusing destructive reset|demo workspace/i,
  );
});

test('fixture seeding receives deterministic pack revisions', async () => {
  const mod = await safeImport('../src/demo-profile.js');
  const seen = [];
  const fixtureProfile = { ...profile, fixtures: ['common/base', 'commerce/catalog'] };
  const adapter = {
    findDemoAccount: async () => ({ id: 'demo-1', demo: true }),
    ensureDemoWorkspace: async () => ({ id: 'ws-1', demo: true }),
    seedDemoFixtures: async (_context, packs) => seen.push(packs.map(pack => `${pack.id}@${pack.revision}`)),
  };
  const prepared = await mod.prepareDemoProfile({ profile: fixtureProfile, adapter, env, context: {} });
  assert.deepEqual(seen, [['common/base@1', 'commerce/catalog@1']]);
  assert.deepEqual(prepared.metadata.fixtures, [
    { id: 'common/base', revision: 1 },
    { id: 'commerce/catalog', revision: 1 },
  ]);
});

test('snapshot strategy imports before use and exports on finalize', async () => {
  const mod = await safeImport('../src/demo-profile.js');
  const calls = [];
  const snapshotProfile = { ...profile, workspace: { strategy: 'snapshot', resetBeforeRun: null } };
  const adapter = {
    findDemoAccount: async () => ({ id: 'demo-1', demo: true }),
    importDemoSnapshot: async () => calls.push('import'),
    ensureDemoWorkspace: async () => { calls.push('workspace'); return { id: 'ws-1', demo: true }; },
    exportDemoSnapshot: async () => calls.push('export'),
  };
  const prepared = await mod.prepareDemoProfile({ profile: snapshotProfile, adapter, env, context: {} });
  await mod.finalizeDemoProfile({ profile: snapshotProfile, adapter, prepared, context: {} });
  assert.deepEqual(calls, ['import', 'workspace', 'export']);
});
