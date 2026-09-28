import test from 'node:test';
import assert from 'node:assert/strict';
import { WebEventBus, createDomainEvent } from '../web/index.mjs';

test('web event bus delivers typed and wildcard subscribers once', async () => {
  const bus = new WebEventBus();
  const calls = [];
  const shared = event => calls.push(event.type);
  bus.subscribe('consultation.saved', shared);
  bus.subscribe('*', shared);
  const event = createDomainEvent({eventId:'evt-1',type:'consultation.saved',aggregate:'consultation',aggregateId:'c1',source:'debora-web',actor:{id:'u1'},payload:{patientId:'p1'}});
  const report = await bus.publishAsync(event);
  assert.equal(report.delivered, 1);
  assert.deepEqual(calls, ['consultation.saved']);
});

test('web event bus isolates subscriber failures', async () => {
  const bus = new WebEventBus();
  bus.subscribe('patient.updated', () => { throw new Error('boom'); });
  bus.subscribe('patient.updated', () => 'ok');
  const event = createDomainEvent({eventId:'evt-2',type:'patient.updated',aggregate:'patient',aggregateId:'p1',source:'debora-web',actor:{id:'u1'},payload:{}});
  const report = await bus.publishAsync(event);
  assert.equal(report.delivered, 1);
  assert.equal(report.failures.length, 1);
});

test('web event bus once subscriber runs only on first matching event', async () => {
  const bus = new WebEventBus();
  let calls = 0;
  bus.once('consultation.saved', () => { calls += 1; });
  const first = createDomainEvent({eventId:'evt-once-1',type:'consultation.saved',aggregate:'consultation',aggregateId:'c1',source:'debora-web',actor:{id:'u1'},payload:{}});
  const second = createDomainEvent({eventId:'evt-once-2',type:'consultation.saved',aggregate:'consultation',aggregateId:'c2',source:'debora-web',actor:{id:'u1'},payload:{}});
  await bus.publishAsync(first);
  await bus.publishAsync(second);
  assert.equal(calls, 1);
});

test('web event bus once also works with synchronous publish', () => {
  const bus = new WebEventBus();
  let calls = 0;
  bus.once('patient.updated', () => { calls += 1; });
  const make = id => createDomainEvent({eventId:id,type:'patient.updated',aggregate:'patient',aggregateId:'p1',source:'debora-web',actor:{id:'u1'},payload:{}});
  bus.publish(make('evt-sync-1'));
  bus.publish(make('evt-sync-2'));
  assert.equal(calls, 1);
});
