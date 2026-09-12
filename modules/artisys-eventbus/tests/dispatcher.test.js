'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDomainEvent } = require('../src/domain-event');
const { DomainEventBus } = require('../src/event-bus');
const { DomainEventDispatcher } = require('../src/dispatcher');
const { MemoryOutboxStore } = require('../src/adapters/memory-outbox');

function event(id, type = 'sale.completed') {
  return createDomainEvent({
    eventId: id,
    type,
    aggregate: 'sale',
    aggregateId: id,
    source: 'test',
    actor: {},
    payload: {}
  });
}

test('memory outbox returns pending events in insertion order', async () => {
  const outbox = new MemoryOutboxStore();
  outbox.insert(event('evt-1'));
  outbox.insert(event('evt-2'));
  assert.deepEqual((await outbox.listPending(10)).map(item => item.eventId), ['evt-1', 'evt-2']);
});

test('dispatcher publishes pending event and marks it dispatched', async () => {
  const outbox = new MemoryOutboxStore();
  const bus = new DomainEventBus();
  let calls = 0;
  bus.subscribe('sale.completed', async () => { calls += 1; });
  outbox.insert(event('evt-1'));
  const dispatcher = new DomainEventDispatcher({ bus, outbox });
  const result = await dispatcher.dispatchPending();
  assert.equal(calls, 1);
  assert.equal(result.dispatched, 1);
  assert.equal((await outbox.listPending(10)).length, 0);
});

test('dispatcher records failure and keeps event pending', async () => {
  const outbox = new MemoryOutboxStore();
  const bus = new DomainEventBus();
  bus.subscribe('sale.completed', () => { throw new Error('consumer failed'); });
  outbox.insert(event('evt-1'));
  const dispatcher = new DomainEventDispatcher({ bus, outbox });
  const result = await dispatcher.dispatchPending();
  assert.equal(result.failed, 1);
  assert.equal((await outbox.listPending(10)).length, 1);
  assert.match(outbox.get('evt-1').lastError, /consumer failed/);
});

test('dispatcher honors batchSize', async () => {
  const outbox = new MemoryOutboxStore();
  const bus = new DomainEventBus();
  outbox.insert(event('evt-1'));
  outbox.insert(event('evt-2'));
  const dispatcher = new DomainEventDispatcher({ bus, outbox, batchSize: 1 });
  const result = await dispatcher.dispatchPending();
  assert.equal(result.attempted, 1);
  assert.equal((await outbox.listPending(10)).length, 1);
});

test('failed pending event can be reprocessed successfully', async () => {
  const outbox = new MemoryOutboxStore();
  const bus = new DomainEventBus();
  let shouldFail = true;
  bus.subscribe('sale.completed', () => {
    if (shouldFail) throw new Error('once');
  });
  outbox.insert(event('evt-1'));
  const dispatcher = new DomainEventDispatcher({ bus, outbox });
  await dispatcher.dispatchPending();
  shouldFail = false;
  const result = await dispatcher.dispatchPending();
  assert.equal(result.dispatched, 1);
  assert.equal((await outbox.listPending(10)).length, 0);
});
