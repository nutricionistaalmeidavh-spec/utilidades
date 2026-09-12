import test from'node:test';import assert from'node:assert/strict';import{createServiceOrder,transitionServiceOrder}from'../src/index.mjs';
test('uses consumer supplied transitions',()=>{const a=createServiceOrder({id:'1'});const b=transitionServiceOrder(a,'done',{transitions:{open:['done']},at:'2026-01-01T00:00:00.000Z'});assert.equal(b.status,'done');assert.equal(b.history.length,1)});
