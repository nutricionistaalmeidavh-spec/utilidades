import test from 'node:test';
import assert from 'node:assert/strict';
import { WebEventBus, WebDomainEventDispatcher, WebIdempotentEffectRunner, createDomainEvent } from '../web/index.mjs';

const event = () => createDomainEvent({eventId:'evt-dispatch',type:'consultation.saved',aggregate:'consultation',aggregateId:'c1',source:'worker',actor:{id:'u1'},payload:{patientId:'p1'}});

test('web dispatcher marks outbox event dispatched after successful async delivery', async () => {
  const bus = new WebEventBus();
  let handled = false;
  bus.subscribe('consultation.saved', async () => { handled = true; });
  let marked = false;
  const outbox = { async listPending(){ return [event()]; }, async markDispatched(){ marked=true; }, async recordFailure(){ throw new Error('unexpected'); } };
  const dispatcher = new WebDomainEventDispatcher({bus,outbox});
  const result = await dispatcher.dispatchPending();
  assert.equal(handled, true);
  assert.equal(marked, true);
  assert.equal(result.dispatched, 1);
});

test('web idempotent runner skips an effect already applied', async () => {
  const applied = new Set();
  const store = { async hasApplied(id,key){ return applied.has(`${id}:${key}`); }, async markApplied(effect){ applied.add(`${effect.eventId}:${effect.effectKey}`); return effect; } };
  const runner = new WebIdempotentEffectRunner({effectStore:store});
  let calls = 0;
  const first = await runner.run({event:event(),effectKey:'refresh-patient',handler:async()=>{calls+=1;}});
  const second = await runner.run({event:event(),effectKey:'refresh-patient',handler:async()=>{calls+=1;}});
  assert.equal(first.applied, true);
  assert.equal(second.skipped, true);
  assert.equal(calls, 1);
});
