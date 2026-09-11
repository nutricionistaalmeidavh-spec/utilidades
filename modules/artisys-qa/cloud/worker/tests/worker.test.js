import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { artifactId, artifactKey, authorize, sanitizeArtifactPath } from '../src/index.js';

test('separates agent write and read credentials', () => {
  const env = { ARTISYS_QA_AGENT_TOKEN: 'agent-secret', ARTISYS_QA_READ_TOKEN: 'read-secret' };
  assert.equal(authorize(new Request('https://qa.test', { headers: { authorization: 'Bearer agent-secret' } }), env, 'agent'), true);
  assert.equal(authorize(new Request('https://qa.test', { headers: { authorization: 'Bearer read-secret' } }), env, 'agent'), false);
  assert.equal(authorize(new Request('https://qa.test', { headers: { authorization: 'Bearer read-secret' } }), env, 'read'), true);
});

test('keeps nested artifact paths while rejecting traversal', () => {
  assert.equal(sanitizeArtifactPath('flow-a/screenshots/shot 1.png'), 'flow-a/screenshots/shot-1.png');
  assert.equal(artifactKey('pdv-artisys', 'job-1', 'flow-a/screenshots/shot.png'), 'projects/pdv-artisys/job-1/flow-a/screenshots/shot.png');
  assert.match(artifactId('job-1', 'flow-a/screenshots/shot.png'), /^job-1-[a-f0-9]{16}$/);
  assert.notEqual(artifactId('job-1', 'flow-a/shot.png'), artifactId('job-1', 'flow-b/shot.png'));
  assert.throws(() => sanitizeArtifactPath('../../shot.png'), /invalid/i);
});

test('health fails closed until DB, R2 and required secrets exist', async () => {
  const response = await worker.fetch(new Request('https://qa.test/health'), {});
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.deepEqual(body.bindings, { DB: false, R2: false });
  assert.equal(JSON.stringify(body).includes('agent-secret'), false);
});
