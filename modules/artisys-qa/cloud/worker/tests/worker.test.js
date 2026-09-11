import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { artifactKey, authorize, sanitizeArtifactName } from '../src/index.js';

test('uses separate agent and read credentials', () => {
  const env = { ARTISYS_QA_AGENT_TOKEN: 'agent-secret', ARTISYS_QA_READ_TOKEN: 'read-secret' };
  assert.equal(authorize(new Request('https://x.test', { headers: { authorization: 'Bearer agent-secret' } }), env, 'agent'), true);
  assert.equal(authorize(new Request('https://x.test', { headers: { authorization: 'Bearer read-secret' } }), env, 'agent'), false);
  assert.equal(authorize(new Request('https://x.test', { headers: { authorization: 'Bearer read-secret' } }), env, 'read'), true);
});

test('artifact names and keys cannot traverse storage namespaces', () => {
  assert.equal(sanitizeArtifactName('../../video.mp4'), 'video.mp4');
  assert.equal(artifactKey('pdv-artisys', 'job-1', '../../shot.png'), 'projects/pdv-artisys/job-1/shot.png');
  assert.throws(() => artifactKey('../pdv', 'job-1', 'x.png'), /invalid/i);
});

test('health reports missing bindings without exposing secrets', async () => {
  const response = await worker.fetch(new Request('https://qa.test/health'), {});
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(JSON.stringify(body).includes('secret'), false);
});
