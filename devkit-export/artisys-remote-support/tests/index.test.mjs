import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeSupportSession, createSupportRequest, executeSupportSession } from '../src/index.mjs';
test('unattended access is disabled by default',()=>{ const s=normalizeSupportSession({targetId:'123'}); assert.equal(s.unattended,false); assert.equal(s.durationMinutes,30); });
test('caps support duration',()=>assert.throws(()=>normalizeSupportSession({targetId:'1',durationMinutes:500}),/duration/));
test('connects through adapter without exposing implementation',async()=>{ let seen; const v=await executeSupportSession({connect:async r=>(seen=r,'connected')},{targetId:'1'}); assert.equal(v,'connected'); assert.equal(seen.provider,'rustdesk'); });
