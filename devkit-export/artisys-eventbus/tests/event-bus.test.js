'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDomainEvent, validateDomainEvent } = require('../src/domain-event');
const { DomainEventBus } = require('../src/event-bus');

function sample(overrides = {}) {
  return createDomainEvent({
    eventId: 'evt-1',
    type: 'sale.completed',
    aggregate: 'sale',
    aggregateId: 'sale-1',
    occurredAt: '2026-09-12T12:00:00.000Z',
    source: 'test',
    actor: { id: 'u1' },
    payload: { total: 10 },
    ...overrides
  });
}

test('createDomainEvent creates and validates a canonical event', () => {
  const event = sample();
  assert.equal(validateDomainEvent(event), event);
  assert.equal(event.type, 'sale.completed');
});

test('validateDomainEvent rejects invalid payload', () => {
  assert.throws(() => validateDomainEvent({}), /eventId/i);
});

test('subscribe delivers and unsubscribe stops delivery', () => {
  const bus = new DomainEventBus();
  let calls = 0;
  const unsubscribe = bus.subscribe('sale.completed', () => { calls += 1; });
  bus.publish(sample());
  assert.equal(calls, 1);
  assert.equal(unsubscribe(), true);
  bus.publish(sample({ eventId: 'evt-2' }));
  assert.equal(calls, 1);
});

test('wildcard subscriber receives every event exactly once', () => {
  const bus = new DomainEventBus();
  let calls = 0;
  const handler = () => { calls += 1; };
  bus.subscribe('*', handler);
  bus.subscribe('sale.completed', handler);
  bus.publish(sample());
  assert.equal(calls, 1);
});

test('publish isolates subscriber failures and continues delivery', () => {
  const bus = new DomainEventBus();
  let delivered = 0;
  bus.subscribe('sale.completed', () => { throw new Error('boom'); });
  bus.subscribe('sale.completed', () => { delivered += 1; });
  const result = bus.publish(sample());
  assert.equal(delivered, 1);
  assert.equal(result.delivered, 1);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].message, /boom/);
});

test('publish rejects asynchronous handlers in sync mode', () => {
  const bus = new DomainEventBus();
  bus.subscribe('sale.completed', async () => {});
  const result = bus.publish(sample());
  assert.equal(result.delivered, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].message, /synchronous/i);
});

test('publishAsync awaits asynchronous handlers', async () => {
  const bus = new DomainEventBus();
  const order = [];
  bus.subscribe('sale.completed', async () => {
    await Promise.resolve();
    order.push('done');
  });
  const result = await bus.publishAsync(sample());
  assert.deepEqual(order, ['done']);
  assert.equal(result.delivered, 1);
  assert.equal(result.failures.length, 0);
});

test('clear and subscriberCount manage subscriptions', () => {
  const bus = new DomainEventBus();
  bus.subscribe('sale.completed', () => {});
  assert.equal(bus.subscriberCount('sale.completed'), 1);
  bus.clear('sale.completed');
  assert.equal(bus.subscriberCount('sale.completed'), 0);
});
