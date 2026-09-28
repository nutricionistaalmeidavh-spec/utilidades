'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDomainEvent } = require('../src/domain-event');
const { SqliteOutboxStore } = require('../src/adapters/sqlite-outbox');
const { SqliteEffectStore } = require('../src/adapters/sqlite-effect-store');
const { SQLITE_SCHEMA } = require('../src/adapters/sqlite-schema');

function event() {
  return createDomainEvent({
    eventId: 'evt-1',
    type: 'sale.completed',
    aggregate: 'sale',
    aggregateId: 'sale-1',
    mutationId: 'mut-1',
    occurredAt: '2026-09-12T12:00:00.000Z',
    source: 'server',
    actor: { id: 'u1' },
    payload: { total: 10 }
  });
}

function fakeOutboxDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        run(...args) { calls.push({ op: 'run', sql, args }); return { changes: 1 }; },
        all(...args) {
          calls.push({ op: 'all', sql, args });
          return [{
            eventId: 'evt-1', type: 'sale.completed', aggregate: 'sale', aggregateId: 'sale-1',
            mutationId: 'mut-1', source: 'server', actorJson: '{"id":"u1"}', payloadJson: '{"total":10}',
            occurredAt: '2026-09-12T12:00:00.000Z'
          }];
        },
        get(...args) { calls.push({ op: 'get', sql, args }); return { found: 1 }; }
      };
    }
  };
}

test('SQLITE_SCHEMA contains the outbox and effect tables', () => {
  assert.match(SQLITE_SCHEMA, /CREATE TABLE IF NOT EXISTS domain_events/i);
  assert.match(SQLITE_SCHEMA, /CREATE TABLE IF NOT EXISTS domain_event_effects/i);
});

test('sqlite outbox inserts and restores canonical events', async () => {
  const db = fakeOutboxDb();
  const store = new SqliteOutboxStore(db);
  store.insert(event());
  const pending = await store.listPending(25);
  assert.equal(pending.length, 1);
  assert.deepEqual(pending[0].actor, { id: 'u1' });
  assert.deepEqual(pending[0].payload, { total: 10 });
  const insertCall = db.calls.find(call => /INSERT INTO domain_events/i.test(call.sql));
  assert.deepEqual(insertCall.args.slice(0, 5), ['evt-1', 'sale.completed', 'sale', 'sale-1', 'mut-1']);
});

test('sqlite outbox updates dispatch and failure state', async () => {
  const db = fakeOutboxDb();
  const store = new SqliteOutboxStore(db);
  await store.markDispatched('evt-1');
  await store.recordFailure('evt-1', 'boom');
  assert.ok(db.calls.some(call => /dispatched_at/i.test(call.sql) && call.args.includes('evt-1')));
  assert.ok(db.calls.some(call => /last_error/i.test(call.sql) && call.args.includes('boom')));
});

test('sqlite effect store checks and marks idempotent effects', async () => {
  const db = fakeOutboxDb();
  const store = new SqliteEffectStore(db);
  assert.equal(await store.hasApplied('evt-1', 'stock'), true);
  await store.markApplied({ eventId: 'evt-1', effectKey: 'stock', aggregate: 'sale', aggregateId: 'sale-1', appliedAt: '2026-09-12T12:00:01.000Z' });
  const insertCall = db.calls.find(call => /INSERT OR IGNORE INTO domain_event_effects/i.test(call.sql));
  assert.deepEqual(insertCall.args, ['evt-1', 'stock', 'sale', 'sale-1', '2026-09-12T12:00:01.000Z']);
});
