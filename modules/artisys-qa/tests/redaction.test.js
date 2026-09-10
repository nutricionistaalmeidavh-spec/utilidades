import test from 'node:test';
import assert from 'node:assert/strict';

async function safeImport(specifier) {
  try { return await import(specifier); } catch { return null; }
}

test('redaction removes configured secret values recursively without mutating input', async () => {
  const mod = await safeImport('../src/redaction.js');
  assert.ok(mod, 'redaction.js must exist');
  assert.equal(typeof mod.redactSecrets, 'function');

  const input = { token: 'abc123', nested: ['safe', 'abc123'], text: 'prefix abc123 suffix' };
  const output = mod.redactSecrets(input, ['abc123']);

  assert.deepEqual(output, {
    token: '[REDACTED]',
    nested: ['safe', '[REDACTED]'],
    text: 'prefix [REDACTED] suffix',
  });
  assert.equal(input.token, 'abc123');
});
