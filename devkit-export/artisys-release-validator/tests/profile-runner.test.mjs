import test from 'node:test';
import assert from 'node:assert/strict';

async function load(relative) {
  try {
    return await import(new URL(relative, import.meta.url));
  } catch (error) {
    assert.fail(`expected ${relative} to load: ${error.message}`);
  }
}

function validProfile(overrides = {}) {
  return {
    schemaVersion: 1,
    product: 'Demo Product',
    version: '1.0.0',
    artifact: 'dist/demo.exe',
    workspace: '.tmp/release-validation',
    phases: [{ id: 'install' }, { id: 'boot' }],
    ...overrides
  };
}

test('profile validates required fields and normalizes defaults immutably', async () => {
  const { defineValidationProfile } = await load('../src/profile.mjs');
  assert.throws(() => defineValidationProfile({}), /product/i);
  const profile = defineValidationProfile(validProfile());
  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.phases[0].required, true);
  assert.equal(profile.phases[0].repeat, 1);
  assert.ok(profile.phases[0].timeoutMs > 0);
  assert.match(profile.reportDir, /release-validation/);
  assert.equal(Object.isFrozen(profile), true);
  assert.equal(Object.isFrozen(profile.phases), true);
});

test('required phase failure blocks release and stops later phases', async () => {
  const { defineValidationProfile } = await load('../src/profile.mjs');
  const { runValidation } = await load('../src/runner.mjs');
  const profile = defineValidationProfile(validProfile({ phases: [
    { id: 'install' }, { id: 'boot' }, { id: 'database' }
  ] }));
  const seen = [];
  const result = await runValidation({
    profile,
    executePhase: async (phase) => {
      seen.push(phase.id);
      if (phase.id === 'boot') return { status: 'fail', reason: 'startup-error' };
      return { status: 'pass' };
    }
  });
  assert.deepEqual(seen, ['install', 'boot']);
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.failedRequired, ['boot']);
});

test('optional phase failure is recorded but does not block later required phases', async () => {
  const { defineValidationProfile } = await load('../src/profile.mjs');
  const { runValidation } = await load('../src/runner.mjs');
  const profile = defineValidationProfile(validProfile({ phases: [
    { id: 'optional-probe', required: false }, { id: 'boot' }
  ] }));
  const seen = [];
  const result = await runValidation({
    profile,
    executePhase: async (phase) => {
      seen.push(phase.id);
      return phase.id === 'optional-probe' ? { status: 'fail', reason: 'not-present' } : { status: 'pass' };
    }
  });
  assert.deepEqual(seen, ['optional-probe', 'boot']);
  assert.equal(result.status, 'APPROVED');
  assert.deepEqual(result.failedRequired, []);
  assert.equal(result.phases[0].status, 'fail');
});

test('repeat executes a stress phase the configured number of times', async () => {
  const { defineValidationProfile } = await load('../src/profile.mjs');
  const { runValidation } = await load('../src/runner.mjs');
  const profile = defineValidationProfile(validProfile({ phases: [{ id: 'stress', repeat: 3 }] }));
  const iterations = [];
  const result = await runValidation({
    profile,
    executePhase: async (_phase, _context, iteration) => {
      iterations.push(iteration);
      return { status: 'pass' };
    }
  });
  assert.deepEqual(iterations, [1, 2, 3]);
  assert.equal(result.phases[0].attempts, 3);
  assert.equal(result.status, 'APPROVED');
});
