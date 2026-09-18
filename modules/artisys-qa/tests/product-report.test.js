import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildProductQaSummary, evaluateProductGate, writeProductQaBundle } from '../src/product-report.js';

test('product gate blocks critical failures, 5xx, console errors and coverage gaps',()=>{
  const gate=evaluateProductGate({
    checks:[{name:'tenant isolation',status:'failed',critical:true}],
    coverage:{uncoveredCritical:1},
    consoleErrors:[{text:'boom'}],
    networkErrors:[{status:500}],
  });
  assert.equal(gate.allowed,false);
  assert.deepEqual(gate.blockers.map(item=>item.type),['critical-check','http-5xx','console-error','critical-coverage-gap']);
});

test('product summary is pass when all P2 policies are clean',()=>{
  const summary=buildProductQaSummary({
    systemId:'demo',
    checks:[{name:'smoke',status:'passed',critical:true}],
    coverage:{discovered:10,covered:10,uncovered:0,uncoveredCritical:0},
    endpoints:[{path:'/health'}],
  });
  assert.equal(summary.status,'PASS');
  assert.equal(summary.counts.passed,1);
  assert.equal(summary.endpointCount,1);
});

test('product bundle writes the standardized P2 artifacts',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'artisys-qa-p2-'));
  const summary=buildProductQaSummary({systemId:'demo',checks:[{name:'smoke',status:'passed'}]});
  const result=await writeProductQaBundle({outputRoot:root,summary,coverage:{discovered:1,covered:1,uncovered:0},runId:'test'});
  for(const name of ['QA-SUMMARY.json','QA-SUMMARY.txt','report.html','coverage.json','endpoints.json','console-errors.json','network-errors.json','findings.json','evidence.json']){
    await fs.access(path.join(result.outputDir,name));
  }
  await fs.rm(root,{recursive:true,force:true});
});

test('override requires an explicit reason',()=>{
  assert.throws(()=>evaluateProductGate({checks:[{status:'failed'}],override:true}),/overrideReason/);
});

test('product bundle redacts supplied secret values',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'artisys-qa-p2-secret-'));
  const secret='super-secret-value';
  const summary=buildProductQaSummary({systemId:'demo',checks:[{name:'smoke',status:'passed',details:{token:secret}}]});
  const result=await writeProductQaBundle({outputRoot:root,summary,findings:[{severity:'warning',detail:secret}],secretValues:[secret],runId:'secret'});
  const text=await fs.readFile(result.files.summaryJson,'utf8');
  const findings=await fs.readFile(result.files.findings,'utf8');
  assert.equal(text.includes(secret),false);
  assert.equal(findings.includes(secret),false);
  assert.match(text,/\[REDACTED\]/);
  await fs.rm(root,{recursive:true,force:true});
});
