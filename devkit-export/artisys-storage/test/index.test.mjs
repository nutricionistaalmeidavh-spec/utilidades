import test from 'node:test';import assert from 'node:assert/strict';import {MemoryStorage,namespaceStorage} from '../src/index.mjs';
test('isolates namespaces',async()=>{const raw=new MemoryStorage();const a=namespaceStorage(raw,'a');const b=namespaceStorage(raw,'b');await a.put('x','1');await b.put('x','2');assert.equal((await a.get('x')).value,'1');assert.deepEqual(await a.list(),['x']);});
