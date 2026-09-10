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
  const env = { DEMO_USER: 'demo@example.test', DEMO_PASS: 'secret-value' };

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
    mod.prepareDemoProfile({ profile: resetProfile, adapter, env: { DEMO_USER: 'demo', DEMO_PASS: 'secret' }, context: {} }),
    /refusing destructive reset|demo workspace/i,
  );
});
