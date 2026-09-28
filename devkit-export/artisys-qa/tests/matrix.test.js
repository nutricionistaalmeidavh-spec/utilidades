import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQaMatrix, runQaMatrix } from '../src/matrix.js';

test('buildQaMatrix creates deterministic profile/environment/viewport cartesian cases',()=>{
  const cases=buildQaMatrix({
    profiles:['quick','release'],
    environments:['local','production'],
    viewports:['desktop','mobile','mobile'],
  });
  assert.equal(cases.length,8);
  assert.deepEqual(cases[0],{id:'quick-local-desktop',profile:'quick',environment:'local',viewport:'desktop'});
  assert.deepEqual(cases.at(-1),{id:'release-production-mobile',profile:'release',environment:'production',viewport:'mobile'});
});

test('runQaMatrix aggregates failures without hiding passing cases',async()=>{
  const cases=buildQaMatrix({profiles:['quick'],environments:['local'],viewports:['desktop','mobile']});
  const seen=[];
  const report=await runQaMatrix({
    cases,
    runner:async item=>{seen.push(item.viewport);if(item.viewport==='mobile')throw new Error('mobile failed');return 'ok';},
  });
  assert.deepEqual(seen,['desktop','mobile']);
  assert.equal(report.status,'failed');
  assert.equal(report.passed,1);
  assert.equal(report.failed,1);
  assert.match(report.results[1].error,/mobile failed/);
});

test('runQaMatrix supports fail-fast for release orchestration',async()=>{
  const cases=buildQaMatrix({profiles:['quick'],environments:['local'],viewports:['desktop','tablet','mobile']});
  const report=await runQaMatrix({
    cases,
    failFast:true,
    runner:async item=>{if(item.viewport==='tablet')throw new Error('stop');},
  });
  assert.equal(report.total,2);
  assert.equal(report.failed,1);
});
