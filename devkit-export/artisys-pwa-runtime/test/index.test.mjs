import test from 'node:test';import assert from 'node:assert/strict';import {createCachePlan,shouldActivateUpdate} from '../src/index.mjs';
test('builds versioned cache plan',()=>{const p=createCachePlan({prefix:'app',version:'2',shell:['/','/']});assert.equal(p.cacheName,'app-2');assert.deepEqual(p.shell,['/']);assert.equal(shouldActivateUpdate('1','2'),true);});
