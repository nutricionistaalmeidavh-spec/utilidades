import test from 'node:test';
import assert from 'node:assert/strict';
import { countBy, summarizeCollection, resolveAggregateQuestion, isAggregateQuestion } from '../src/index.mjs';

function modules(count, stable = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m-${index + 1}`,
    status: index < stable ? 'stable' : 'implemented',
    name: `Module ${index + 1}`,
  }));
}

for (const count of [0, 1, 14, 61, 500]) {
  test(`summarizeCollection reports exact logical total for ${count} items`, () => {
    const summary = summarizeCollection(modules(count));
    assert.equal(summary.total, count);
    assert.equal(summary.uniqueTotal, count);
    assert.equal(summary.physicalTotal, count);
    assert.equal(summary.complete, true);
  });
}

test('duplicate ids do not inflate logical totals', () => {
  const input = modules(61);
  input.push({ ...input[0] });
  const summary = summarizeCollection(input);
  assert.equal(summary.total, 61);
  assert.equal(summary.uniqueTotal, 61);
  assert.equal(summary.physicalTotal, 62);
});

test('items without ids are counted physically', () => {
  const summary = summarizeCollection([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  assert.equal(summary.total, 3);
  assert.equal(summary.physicalTotal, 3);
});

test('order does not affect logical total or status aggregates', () => {
  const input = modules(61, 10);
  const a = summarizeCollection(input);
  const b = summarizeCollection([...input].reverse());
  assert.equal(a.total, b.total);
  assert.deepEqual(a.aggregates.status, b.aggregates.status);
  assert.deepEqual(a.aggregates.status, { stable: 10, implemented: 51 });
});

test('countBy uses logical items and supports property selectors', () => {
  const input = modules(4, 2);
  input.push({ ...input[0] });
  assert.deepEqual(countBy(input, 'status'), { stable: 2, implemented: 2 });
});

test('itemLimit truncates payload without changing totals or groups', () => {
  const summary = summarizeCollection(modules(61, 10), { itemLimit: 14 });
  assert.equal(summary.total, 61);
  assert.equal(summary.returnedItems, 14);
  assert.equal(summary.truncated, true);
  assert.deepEqual(summary.aggregates.status, { stable: 10, implemented: 51 });
});

test('explicit incomplete collection cannot resolve aggregate answer', () => {
  const summary = summarizeCollection(modules(14), { complete: false });
  const resolved = resolveAggregateQuestion('Quantos módulos temos?', summary);
  assert.equal(resolved.resolved, false);
  assert.equal(resolved.reason, 'collection-incomplete');
});

for (const question of [
  'Quantos módulos temos?',
  'Qual o total de módulos?',
  'Número de módulos',
  'Quantidade de módulos',
  'Quantos módulos existem no RepoUteis?',
  'QUANTOS MODULOS TEMOS?',
  'how many modules are there?',
]) {
  test(`aggregate intent is recognized: ${question}`, () => {
    assert.equal(isAggregateQuestion(question), true);
    const resolved = resolveAggregateQuestion(question, summarizeCollection(modules(61)));
    assert.equal(resolved.resolved, true);
    assert.equal(resolved.value, 61);
    assert.match(resolved.answer, /61/);
    assert.equal(resolved.provenance, 'deterministic');
  });
}

test('stable and implemented counts resolve from grouped metadata', () => {
  const summary = summarizeCollection(modules(61, 10), { itemLimit: 4 });
  const stable = resolveAggregateQuestion('Quantos módulos estão estáveis?', summary);
  const implemented = resolveAggregateQuestion('Quantos módulos estão implementados?', summary);
  assert.equal(stable.value, 10);
  assert.equal(implemented.value, 51);
  assert.match(stable.answer, /10/);
  assert.match(implemented.answer, /51/);
});

test('non aggregate question is not intercepted', () => {
  const resolved = resolveAggregateQuestion('Liste os módulos do RepoUteis', summarizeCollection(modules(61)));
  assert.deepEqual(resolved, { resolved: false, reason: 'not-an-aggregate-question' });
});
