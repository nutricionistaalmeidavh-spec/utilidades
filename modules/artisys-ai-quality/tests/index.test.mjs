import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEvaluationSuite,
  buildPromptfooConfig,
  summarizeEvaluation,
  executeEvaluation,
  normalizeFactRegressionCase,
  evaluateFactRegression,
  buildCollectionRegressionCase,
} from '../src/index.mjs';

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

test('normalizes factual regression case without changing old suite contract', () => {
  const normalized = normalizeFactRegressionCase({
    id: 'module-count',
    question: 'Quantos módulos temos?',
    requiredFacts: ['61'],
    forbiddenClaims: ['14 módulos'],
    exactAggregates: { total: 61 },
    requireDeterministic: true,
    tags: ['rag', 'aggregate'],
  });
  assert.equal(normalized.id, 'module-count');
  assert.deepEqual(normalized.requiredFacts, ['61']);
  assert.deepEqual(normalized.forbiddenClaims, ['14 módulos']);
  assert.deepEqual(normalized.exactAggregates, { total: 61 });
  assert.equal(normalized.requireDeterministic, true);
});

test('evaluates required facts forbidden claims aggregate values and provenance', () => {
  const testCase = normalizeFactRegressionCase({
    id: 'module-count',
    question: 'Quantos módulos temos?',
    requiredFacts: ['61'],
    forbiddenClaims: ['14 módulos'],
    exactAggregates: { total: 61 },
    requireDeterministic: true,
  });
  const result = evaluateFactRegression(testCase, {
    answer: 'Temos 61 módulos.',
    provider: 'deterministic',
    aggregates: { total: 61 },
  });
  assert.equal(result.pass, true);
  assert.equal(result.requiredFactCoverage, 1);
  assert.equal(result.forbiddenClaimRate, 0);
  assert.equal(result.exactAggregatePass, true);
  assert.equal(result.deterministicPass, true);
});

test('factual regression fails on the real 61 to 14 truncation bug', () => {
  const testCase = buildCollectionRegressionCase({
    id: 'repoutils-module-count',
    question: 'Quantos módulos temos?',
    expectedTotal: 61,
    forbiddenTotals: [14],
    requireDeterministic: true,
  });
  const result = evaluateFactRegression(testCase, {
    answer: 'Temos 14 módulos (índices 0 a 13).',
    provider: 'fake',
    aggregates: { total: 14 },
  });
  assert.equal(result.pass, false);
  assert.equal(result.requiredFactCoverage, 0);
  assert.equal(result.forbiddenClaimRate, 1);
  assert.equal(result.exactAggregatePass, false);
  assert.equal(result.deterministicPass, false);
  assert.ok(result.failures.length >= 3);
});

test('collection regression helper produces exact aggregate and forbidden total contracts', () => {
  const testCase = buildCollectionRegressionCase({
    id: 'modules',
    question: 'Qual o total?',
    expectedTotal: 61,
    forbiddenTotals: [14, 13],
    tags: ['truncation'],
  });
  assert.deepEqual(testCase.exactAggregates, { total: 61 });
  assert.ok(testCase.requiredFacts.includes('61'));
  assert.ok(testCase.forbiddenClaims.includes('14'));
  assert.ok(testCase.tags.includes('truncation'));
});

test('truncation awareness can require complete structured evidence', () => {
  const testCase = normalizeFactRegressionCase({
    id: 'complete',
    question: 'Quantos?',
    requiredFacts: ['61'],
    requireCompleteEvidence: true,
  });
  const result = evaluateFactRegression(testCase, {
    answer: '61',
    evidence: { complete: false, truncated: true },
  });
  assert.equal(result.pass, false);
  assert.ok(result.failures.some(item => item.type === 'incomplete-evidence'));
});
