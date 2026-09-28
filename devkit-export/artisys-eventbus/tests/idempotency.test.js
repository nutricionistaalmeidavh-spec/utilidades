'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDomainEvent } = require('../src/domain-event');
const { IdempotentEffectRunner } = require('../src/effect-runner');
const { MemoryEffectStore } = require('../src/adapters/memory-effect-store');

function event(id = 'evt-1') {
  return createDomainEvent({
    eventId: id,
    type: 'sale.completed',
    aggregate: 'sale',
    aggregateId: 'sale-1',
    source: 'test',
    actor: {},
    payload: {}
  });
}

test('runs an effect once and marks it applied', async () => {
  const store = new MemoryEffectStore();
  const runner = new IdempotentEffectRunner({ effectStore: store });
  let calls = 0;
  const first = await runner.run({ event: event(), effectKey: 'stock.decrement', handler: async () => { calls += 1; } });
  const second = await runner.run({ event: event(), effectKey: 'stock.decrement', handler: async () => { calls += 1; } });
  assert.equal(calls, 1);
  assert.equal(first.applied, true);
  assert.equal(second.skipped, true);
  assert.equal(await store.hasApplied('evt-1', 'stock.decrement'), true);
});

test('does not mark a failed effect as applied', async () => {
  const store = new MemoryEffectStore();
  const runner = new IdempotentEffectRunner({ effectStore: store });
  await assert.rejects(
    () => runner.run({ event: event(), effectKey: 'receipt.print', handler: async () => { throw new Error('printer'); } }),
    /printer/
  );
  assert.equal(await store.hasApplied('evt-1', 'receipt.print'), false);
});

test('allows different effect keys for the same event', async () => {
  const store = new MemoryEffectStore();
  const runner = new IdempotentEffectRunner({ effectStore: store });
  let calls = 0;
  await runner.run({ event: event(), effectKey: 'stock', handler: () => { calls += 1; } });
  await runner.run({ event: event(), effectKey: 'cash', handler: () => { calls += 1; } });
  assert.equal(calls, 2);
});
