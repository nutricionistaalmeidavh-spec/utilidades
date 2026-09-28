import test from 'node:test'; import assert from 'node:assert/strict';
import { summarizeProductQa, runProductQa } from '../src/index.mjs';
test('blocks critical security finding',()=>{ const s=summarizeProductQa([{check:'security',status:'pass',findings:[{severity:'critical'}]}]); assert.equal(s.status,'blocked'); });
test('passes clean required checks',()=>{ const s=summarizeProductQa([{check:'qa',status:'pass'},{check:'security',status:'pass'}]); assert.equal(s.status,'pass'); });
test('runs named product checks',async()=>{ const r=await runProductQa({qa:async()=>({status:'pass'}),security:async()=>({status:'pass'})},{checks:['qa','security']}); assert.equal(r.status,'pass'); assert.equal(r.results.length,2); });
