import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../web/index.mjs';

test('web entry exports browser and D1 integration API', () => {
  const expected = ['createDomainEvent','validateDomainEvent','WebEventBus','WebDomainEventDispatcher','WebIdempotentEffectRunner','BroadcastChannelBridge','D1OutboxStore','D1EffectStore','D1_SCHEMA','RemoteEventBridge'];
  for (const key of expected) assert.ok(key in api, key);
});
