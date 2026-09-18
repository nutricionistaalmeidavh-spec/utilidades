import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { summarizeCollection } from '../../artisys-structured-facts/src/index.mjs';
import { createCollectionArbitraries, assertCollectionProperties } from '../src/index.mjs';

test('creates reusable collection arbitraries with bounded sizes', () => {
  const arbitraries = createCollectionArbitraries(fc, { maxItems: 80, maxDescriptionLength: 120 });
  assert.ok(arbitraries.module);
  assert.ok(arbitraries.modules);
  assert.ok(arbitraries.status);
});

test('generated collection properties hold for structured facts', () => {
  const result = assertCollectionProperties({
    fc,
    summarizeCollection,
    numRuns: 80,
    maxItems: 120,
  });
  assert.equal(result.ok, true);
  assert.equal(result.properties.length >= 6, true);
});

test('fails clearly when fast-check is not injected', () => {
  assert.throws(() => createCollectionArbitraries(null), /fast-check/i);
});

test('fails clearly when summarizeCollection is not injected', () => {
  assert.throws(() => assertCollectionProperties({ fc }), /summarizeCollection/i);
});
