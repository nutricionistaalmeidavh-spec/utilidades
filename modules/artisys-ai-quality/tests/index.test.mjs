import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvaluationSuite, buildPromptfooConfig, summarizeEvaluation, executeEvaluation } from '../src/index.mjs';

test('normalizes evaluation suite and defaults threshold', () => {
  const suite = normalizeEvaluationSuite({ name: 'assistant', providers: ['openai:gpt'], cases: [{ id: 'hello', prompt: 'Oi', expected: 'Olá' }] });
  assert.equal(suite.threshold, 1);
  assert.equal(suite.cases[0].id, 'hello');
});

test('builds promptfoo config without credentials', () => {
  const config = buildPromptfooConfig({ name: 'assistant', providers: ['openai:gpt'], cases: [{ id: 'hello', prompt: 'Oi', expected: 'Olá' }] });
  assert.deepEqual(config.providers, ['openai:gpt']);
  assert.equal(config.tests[0].vars.prompt, 'Oi');
  assert.deepEqual(config.tests[0].assert, [{ type: 'contains', value: 'Olá' }]);
  assert.equal('apiKey' in config, false);
});

test('summarizes evaluation pass rate', () => {
  const summary = summarizeEvaluation([{ pass: true }, { pass: false }, { pass: true }]);
  assert.deepEqual(summary, { total: 3, passed: 2, failed: 1, passRate: 2 / 3 });
});

test('executes evaluation through injected adapter', async () => {
  const result = await executeEvaluation({ run: async config => ({ config, results: [{ pass: true }] }) }, { name: 'assistant', providers: ['local'], cases: [{ id: 'x', prompt: 'x' }] });
  assert.equal(result.summary.passed, 1);
});
