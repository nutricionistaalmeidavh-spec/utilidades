import test from 'node:test';
import assert from 'node:assert/strict';
import { WebEventBus, createDomainEvent, RemoteEventBridge } from '../web/index.mjs';

class FakeEventSource {
  static last;
  constructor(url, options) { this.url=url; this.options=options; FakeEventSource.last=this; }
  emit(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  fail(error) { this.onerror?.(error); }
  close() { this.closed = true; }
}

test('remote event bridge republishes valid SSE domain events locally', async () => {
  const bus = new WebEventBus();
  let received;
  bus.subscribe('consultation.saved', e => { received = e.payload.patientId; });
  const bridge = new RemoteEventBridge({ bus, url:'/events', EventSourceImpl:FakeEventSource });
  bridge.start();
  FakeEventSource.last.emit(createDomainEvent({eventId:'evt-sse',type:'consultation.saved',aggregate:'consultation',aggregateId:'c1',source:'worker',actor:{id:'u1'},payload:{patientId:'p1'}}));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(received, 'p1');
  bridge.stop();
  assert.equal(FakeEventSource.last.closed, true);
});

test('remote event bridge reports malformed payload without publishing it', async () => {
  const bus = new WebEventBus();
  let errors = 0;
  let delivered = 0;
  bus.subscribe('*', () => { delivered += 1; });
  const bridge = new RemoteEventBridge({ bus, url:'/events', EventSourceImpl:FakeEventSource, onError:() => { errors += 1; } });
  bridge.start();
  FakeEventSource.last.onmessage({ data:'not-json' });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(errors, 1);
  assert.equal(delivered, 0);
  bridge.stop();
});
