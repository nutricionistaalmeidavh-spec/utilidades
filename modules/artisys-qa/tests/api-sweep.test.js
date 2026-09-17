import test from 'node:test';
import assert from 'node:assert/strict';
import { runApiSweep } from '../src/api-sweep.js';

test('API sweep validates expected statuses and JSON',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{
    calls.push({url,method:init.method});
    if(String(url).endsWith('/ok'))return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});
    return new Response(JSON.stringify({error:'nope'}),{status:401,headers:{'content-type':'application/json'}});
  };
  const report=await runApiSweep({
    baseURL:'https://example.test',
    fetchImpl,
    endpoints:[
      {name:'ok',path:'/ok',expectedStatus:200,expectJson:true},
      {name:'protected',path:'/private',expectedStatus:[401,403],expectJson:true},
    ],
  });
  assert.equal(report.status,'passed');
  assert.equal(report.passed,2);
  assert.deepEqual(calls.map(x=>x.method),['GET','GET']);
});

test('API sweep reports unexpected status without leaking request headers',async()=>{
  const report=await runApiSweep({
    baseURL:'https://example.test',
    defaultHeaders:{authorization:'Bearer sensitive-value'},
    fetchImpl:async()=>new Response('boom',{status:500}),
    endpoints:[{name:'health',path:'/health',expectedStatus:200}],
  });
  assert.equal(report.status,'failed');
  assert.equal(report.failed,1);
  assert.equal(JSON.stringify(report).includes('sensitive-value'),false);
});
