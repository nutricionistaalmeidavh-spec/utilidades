import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import * as manifestModule from '../src/manifest.js';

async function safeImport(specifier) {
  try { return await import(specifier); } catch { return null; }
}

function legacyManifest() {
  return {
    schemaVersion: 1,
    systemId: 'legacy',
    mode: 'web',
    environments: { ci: { baseURL: 'https://example.test' } },
    flows: { smoke: 'smoke.json' },
  };
}

test('legacy manifest remains valid without demo profiles', () => {
  assert.equal(manifestModule.validateQaManifest(legacyManifest()), true);
});

test('demo profile rejects literal credentials', () => {
  const manifest = {
    ...legacyManifest(),
    demoProfiles: {
      default: {
        adapter: './adapter.mjs',
        account: { username: 'demo', password: 'secret' },
        workspace: { strategy: 'persistent' },
      },
    },
  };
  assert.throws(() => manifestModule.validateQaManifest(manifest), /environment variable|credential|secret/i);
});

test('resolves default demo profile and adapter relative to manifest root', () => {
  assert.equal(typeof manifestModule.resolveDemoProfile, 'function');
  const manifest = {
    ...legacyManifest(),
    defaultDemoProfile: 'default',
    demoProfiles: {
      default: {
        adapter: './demo-adapter.mjs',
        account: { createIfMissing: true, usernameEnv: 'DEMO_USER', passwordEnv: 'DEMO_PASS' },
        workspace: { strategy: 'persistent', resetBeforeRun: 'baseline' },
        fixtures: ['common/base'],
      },
    },
  };
  const resolved = manifestModule.resolveDemoProfile(manifest, undefined, '/tmp/qa');
  assert.equal(resolved.name, 'default');
  assert.equal(resolved.adapterPath, path.resolve('/tmp/qa/demo-adapter.mjs'));
  assert.equal(resolved.workspace.strategy, 'persistent');
});

test('adapter loader module exists and validates hook shapes', async () => {
  const adapters = await safeImport('../src/adapters.js');
  assert.ok(adapters, 'adapters.js must exist');
  assert.equal(typeof adapters.validateDemoAdapter, 'function');
  assert.doesNotThrow(() => adapters.validateDemoAdapter({ findDemoAccount: async () => null }));
  assert.throws(() => adapters.validateDemoAdapter({ findDemoAccount: true }), /function/i);
});
