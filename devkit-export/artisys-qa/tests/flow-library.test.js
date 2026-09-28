import test from 'node:test';
import assert from 'node:assert/strict';

async function safeImport(specifier) {
  try { return await import(specifier); } catch { return null; }
}

test('built-in reusable flow expands uses entries in order', async () => {
  const mod = await safeImport('../src/flow-library.js');
  assert.ok(mod, 'flow-library.js must exist');
  assert.equal(typeof mod.resolveFlowComposition, 'function');

  const resolved = await mod.resolveFlowComposition({
    steps: [
      { uses: 'common/login' },
      { action: 'screenshot', name: 'done' },
    ],
  });

  assert.equal(resolved.steps.at(-1).action, 'screenshot');
  assert.ok(resolved.steps.some(step => step.action === 'capability' && step.name === 'auth.login'));
});

test('flow composition rejects recursive includes', async () => {
  const mod = await safeImport('../src/flow-library.js');
  assert.ok(mod, 'flow-library.js must exist');
  await assert.rejects(
    mod.resolveFlowComposition({ id: 'loop', steps: [{ uses: 'loop' }] }, {
      customLibrary: new Map([['loop', { id: 'loop', steps: [{ uses: 'loop' }] }]]),
    }),
    /cycle|recursive/i,
  );
});
