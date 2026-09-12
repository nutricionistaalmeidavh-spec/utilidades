'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../src');

test('public index exports the reusable EventBus API', () => {
  const expected = [
    'createDomainEvent', 'validateDomainEvent', 'DomainEventBus', 'DomainEventDispatcher',
    'IdempotentEffectRunner', 'MemoryOutboxStore', 'MemoryEffectStore',
    'SqliteOutboxStore', 'SqliteEffectStore', 'SQLITE_SCHEMA'
  ];
  for (const key of expected) assert.equal(typeof api[key] === 'string' || typeof api[key] === 'function', true, key);
});
