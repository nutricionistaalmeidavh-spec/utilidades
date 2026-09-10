import test from 'node:test';
import assert from 'node:assert/strict';
import { executeStep } from '../src/steps.js';

test('capability step delegates to adapter capability', async () => {
  const calls = [];
  const adapter = {
    capabilities: {
      'auth.login': async ({ step, runtimeContext }) => calls.push({ name: step.name, runtimeContext }),
    },
  };
  const runtimeContext = { profile: 'default' };

  const label = await executeStep({
    page: {},
    step: { action: 'capability', name: 'auth.login' },
    index: 0,
    screenshotsDir: '/tmp',
    adapter,
    runtimeContext,
  });

  assert.equal(label, '01-auth.login');
  assert.deepEqual(calls, [{ name: 'auth.login', runtimeContext }]);
});
