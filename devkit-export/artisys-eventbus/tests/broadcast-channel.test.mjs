import test from 'node:test';
import assert from 'node:assert/strict';
import { WebEventBus, createDomainEvent, BroadcastChannelBridge } from '../web/index.mjs';

class FakeBroadcastChannel {
  static rooms = new Map();
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    const room = FakeBroadcastChannel.rooms.get(name) || new Set();
    room.add(this);
    FakeBroadcastChannel.rooms.set(name, room);
  }
  postMessage(data) {
    for (const peer of FakeBroadcastChannel.rooms.get(this.name) || []) {
      if (peer !== this && peer.onmessage) queueMicrotask(() => peer.onmessage({ data }));
    }
  }
  close() { FakeBroadcastChannel.rooms.get(this.name)?.delete(this); }
}

const event = () => createDomainEvent({eventId:'evt-tabs',type:'appointment.created',aggregate:'appointment',aggregateId:'a1',source:'debora-web',actor:{id:'u1'},payload:{patientId:'p1'}});

test('broadcast bridge mirrors local events to another tab without echo loop', async () => {
  const busA = new WebEventBus();
  const busB = new WebEventBus();
  const bridgeA = new BroadcastChannelBridge({ bus: busA, channelName: 'debora', BroadcastChannelImpl: FakeBroadcastChannel });
  const bridgeB = new BroadcastChannelBridge({ bus: busB, channelName: 'debora', BroadcastChannelImpl: FakeBroadcastChannel });
  bridgeA.start(); bridgeB.start();
  let received = 0;
  busB.subscribe('appointment.created', () => { received += 1; });
  await busA.publishAsync(event());
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(received, 1);
  bridgeA.stop(); bridgeB.stop();
});
