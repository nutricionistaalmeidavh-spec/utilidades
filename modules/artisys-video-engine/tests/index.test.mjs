import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeVideoJob, compileVideoPlan, executeVideoJob } from '../src/index.mjs';
test('normalizes trim and compiles duration',()=>{ const p=compileVideoPlan({input:'in.mp4',output:{path:'out.mp4',format:'mp4'},operations:[{type:'trim',start:2,end:7}]}); assert.equal(p.durationSeconds,5); assert.equal(p.engine,'gstreamer'); });
test('executes through injected adapter', async()=>{ let seen; const out=await executeVideoJob({execute:async p=>(seen=p,'ok')},{input:'in.mp4',output:{path:'out.mp4',format:'mp4'}}); assert.equal(out,'ok'); assert.equal(seen.output.path,'out.mp4'); });
test('rejects invalid trim',()=>assert.throws(()=>normalizeVideoJob({input:'x',output:{path:'o',format:'mp4'},operations:[{type:'trim',start:3,end:2}]}),/trim/));
