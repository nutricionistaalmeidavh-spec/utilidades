import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MUTATION_THRESHOLDS, buildStrykerConfig } from '../src/index.mjs';

test('builds local command-runner Stryker configuration', () => {
  const config = buildStrykerConfig({
    mutate: ['src/index.mjs'],
    testCommand: 'node --test tests/index.test.mjs',
  });
  assert.deepEqual(config.mutate, ['src/index.mjs']);
  assert.equal(config.testRunner, 'command');
  assert.equal(config.commandRunner.command, 'node --test tests/index.test.mjs');
  assert.equal(config.coverageAnalysis, 'off');
  assert.deepEqual(config.thresholds, DEFAULT_MUTATION_THRESHOLDS);
  assert.equal(config.dashboard, undefined);
});

test('uses strict default mutation thresholds for deterministic core logic', () => {
  assert.equal(DEFAULT_MUTATION_THRESHOLDS.high >= 90, true);
  assert.equal(DEFAULT_MUTATION_THRESHOLDS.low >= 80, true);
  assert.equal(DEFAULT_MUTATION_THRESHOLDS.break >= 80, true);
});

test('allows consumers to override mutation policy without hosted services', () => {
  const config = buildStrykerConfig({
    thresholds: { high: 95, low: 90, break: 90 },
    concurrency: 2,
    timeoutMS: 120000,
  });
  assert.deepEqual(config.thresholds, { high: 95, low: 90, break: 90 });
  assert.equal(config.concurrency, 2);
  assert.equal(config.timeoutMS, 120000);
  assert.equal('dashboard' in config, false);
});
