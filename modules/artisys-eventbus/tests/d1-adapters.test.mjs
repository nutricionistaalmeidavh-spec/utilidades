import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomainEvent, D1OutboxStore, D1EffectStore, D1_SCHEMA } from '../web/index.mjs';

class FakeD1 {
  constructor() { this.events = new Map(); this.effects = new Set(); }
  prepare(sql) {
    const db = this;
    return {
      args: [],
      bind(...args) { this.args = args; return this; },
      async run() {
        if (sql.includes('INSERT INTO domain_events')) {
          const [eventId,type,aggregate,aggregateId,mutationId,source,actorJson,payloadJson,occurredAt] = this.args;
          db.events.set(eventId,{event_id:eventId,type,aggregate_type:aggregate,aggregate_id:String(aggregateId),mutation_id:mutationId,source,actor_json:actorJson,payload_json:payloadJson,occurred_at:occurredAt,dispatched_at:null,last_error:null});
        } else if (sql.includes('SET dispatched_at')) {
          const [eventId] = this.args; const row = db.events.get(eventId); row.dispatched_at = 'now'; row.last_error = null;
        } else if (sql.includes('SET last_error')) {
          const [message,eventId] = this.args; db.events.get(eventId).last_error = message;
        } else if (sql.includes('INSERT OR IGNORE INTO domain_event_effects')) {
          const [eventId,effectKey] = this.args; db.effects.add(`${eventId}:${effectKey}`);
        }
        return { success:true };
      },
      async all() {
        if (sql.includes('FROM domain_events') && sql.includes('dispatched_at IS NULL')) {
          const limit = this.args[0];
          return { results:[...db.events.values()].filter(r=>!r.dispatched_at).sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.event_id.localeCompare(b.event_id)).slice(0,limit) };
        }
        return { results:[] };
      },
      async first() {
        if (sql.includes('FROM domain_event_effects')) {
          const [eventId,effectKey] = this.args;
          return db.effects.has(`${eventId}:${effectKey}`) ? { found:1 } : null;
        }
        return null;
      }
    };
  }
}

const event = () => createDomainEvent({eventId:'evt-d1',type:'consultation.saved',aggregate:'consultation',aggregateId:'c1',mutationId:'m1',source:'worker',actor:{id:'u1'},payload:{patientId:'p1'},occurredAt:'2026-09-12T12:00:00.000Z'});

test('D1 outbox inserts, lists and marks a domain event dispatched', async () => {
  const db = new FakeD1();
  const store = new D1OutboxStore(db);
  await store.insert(event());
  const pending = await store.listPending(10);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].payload.patientId, 'p1');
  await store.markDispatched('evt-d1');
  assert.deepEqual(await store.listPending(10), []);
});

test('D1 outbox exposes a prepared insert for atomic D1 batch writes', async () => {
  const db = new FakeD1();
  const store = new D1OutboxStore(db);
  const statement = store.prepareInsert(event());
  assert.equal(typeof statement.run, 'function');
  await statement.run();
  assert.equal((await store.listPending()).length, 1);
});

test('D1 outbox records failure for retry', async () => {
  const db = new FakeD1();
  const store = new D1OutboxStore(db);
  await store.insert(event());
  await store.recordFailure('evt-d1', 'temporary failure');
  assert.equal(db.events.get('evt-d1').last_error, 'temporary failure');
  assert.equal((await store.listPending()).length, 1);
});

test('D1 effect store supports idempotency checks', async () => {
  const db = new FakeD1();
  const store = new D1EffectStore(db);
  assert.equal(await store.hasApplied('evt-d1','refresh-patient'), false);
  await store.markApplied({eventId:'evt-d1',effectKey:'refresh-patient',aggregate:'consultation',aggregateId:'c1'});
  assert.equal(await store.hasApplied('evt-d1','refresh-patient'), true);
});

test('D1 schema creates the durable outbox and effect tables', () => {
  assert.match(D1_SCHEMA, /CREATE TABLE IF NOT EXISTS domain_events/);
  assert.match(D1_SCHEMA, /CREATE TABLE IF NOT EXISTS domain_event_effects/);
});
