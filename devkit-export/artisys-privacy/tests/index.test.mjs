import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePrivacyRequest, createPresidioJob, redactSpans, executePrivacy } from '../src/index.mjs';

test('normalizes privacy request', () => {
  const req = normalizePrivacyRequest({ text: 'CPF 123', mode: 'anonymize' });
  assert.equal(req.language, 'pt');
  assert.deepEqual(req.entities, []);
});

test('creates local presidio job', () => {
  const job = createPresidioJob({ text: 'email a@b.com', mode: 'analyze' });
  assert.equal(job.provider, 'presidio');
  assert.equal(job.execution, 'local-on-demand');
});

test('redacts detected spans from right to left', () => {
  const text = redactSpans('Ana 123', [{ start: 0, end: 3, entityType: 'PERSON' }, { start: 4, end: 7, entityType: 'CPF' }]);
  assert.equal(text, '[PERSON] [CPF]');
});

test('executes privacy through injected adapter', async () => {
  const result = await executePrivacy({ process: async job => ({ mode: job.mode, entities: [] }) }, { text: 'abc', mode: 'analyze' });
  assert.equal(result.mode, 'analyze');
});
