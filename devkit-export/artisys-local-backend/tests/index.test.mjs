import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeBackendConfig, buildPocketBasePlan, executeLocalBackend } from '../src/index.mjs';
test('defaults to loopback and builds pocketbase serve plan',()=>{ const p=buildPocketBasePlan({dataDir:'./data',collections:[{name:'users',fields:[{name:'email',type:'email'}]}]}); assert.equal(p.host,'127.0.0.1'); assert.deepEqual(p.args.slice(0,2),['serve','--dir']); });
test('remote bind needs explicit opt in',()=>assert.throws(()=>normalizeBackendConfig({dataDir:'x',host:'0.0.0.0'}),/allowRemote/));
test('runs through spawn adapter',async()=>{ let seen; await executeLocalBackend({spawn:async p=>(seen=p,{pid:1})},{dataDir:'x'}); assert.equal(seen.executable,'pocketbase'); });
