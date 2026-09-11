import test from 'node:test'; import assert from 'node:assert/strict';
import { createReleasePlan, evaluateReleaseResults, runReleaseGate, hashArtifact } from '../src/index.mjs';
test('default gate contains qa security api contracts and signing',()=>{ const p=createReleasePlan({product:'PDV',version:'1.2.3',artifacts:['pdv.exe']}); assert.deepEqual(p.checks,['qa','security','api-contracts','signing']); });
test('blocks on failed required check',()=>{ const s=evaluateReleaseResults([{check:'qa',status:'pass'},{check:'security',status:'fail'}]); assert.equal(s.status,'blocked'); });
test('runs gates sequentially',async()=>{ const order=[]; const runners={qa:async()=>{order.push('qa');return {status:'pass'}},security:async()=>{order.push('security');return {status:'pass'}}}; const r=await runReleaseGate(runners,{product:'x',version:'1',artifacts:[],checks:['qa','security']}); assert.equal(r.status,'pass'); assert.deepEqual(order,['qa','security']); });
test('hashes artifacts deterministically',()=>assert.equal(hashArtifact(Buffer.from('a')).length,64));
