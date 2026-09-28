import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLocalUser, verifyLocalPassword, createLocalSession, verifyLocalSession, revokeLocalSession, createPolicy, requirePermission } from '../src/browser.mjs';

test('browser auth uses async Web Crypto compatible user and session primitives', async () => {
  const user = await createLocalUser({ id:'u1', username:'Victor', password:'SenhaForte123!', roles:['viewer'] }, { salt:'00112233445566778899aabbccddeeff' });
  assert.equal(user.username, 'victor');
  assert.equal(await verifyLocalPassword(user, 'SenhaForte123!'), true);
  assert.equal(await verifyLocalPassword(user, 'senha-errada'), false);
  const created = await createLocalSession(user, { id:'s1', token:'token-de-teste-1234567890', issuedAt:'2026-09-13T12:00:00.000Z', expiresAt:'2026-09-13T20:00:00.000Z' });
  assert.equal(await verifyLocalSession(created.session, created.token, { now:'2026-09-13T13:00:00.000Z' }), true);
  const revoked = await revokeLocalSession(created.session, { at:'2026-09-13T14:00:00.000Z' });
  assert.equal(await verifyLocalSession(revoked, created.token, { now:'2026-09-13T15:00:00.000Z' }), false);
});

test('browser auth preserves RBAC policy semantics and has no Node builtin imports', async () => {
  const policy = createPolicy({ viewer:['records:read'] });
  assert.equal(requirePermission(policy, ['viewer'], 'records:read'), true);
  assert.throws(() => requirePermission(policy, ['viewer'], 'records:write'), (error)=>error?.code==='FORBIDDEN');
  const source = await readFile(new URL('../src/browser.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /(?:from|import\()\s*['"]node:/);
  assert.doesNotMatch(source, /\bBuffer\b/);
});
