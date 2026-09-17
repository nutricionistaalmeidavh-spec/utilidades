import test from 'node:test';
import assert from 'node:assert/strict';
import { runUiSweep } from '../src/ui-sweep.js';

class FakePage{
  constructor(){this.handlers=new Map();this.current='https://example.test/';this.visits=[]}
  on(name,fn){this.handlers.set(name,fn)}
  url(){return this.current}
  async goto(url){this.current=url;this.visits.push(url);return{status:()=>200}}
  async evaluate(){
    if(this.current.endsWith('/'))return{
      title:'Home',
      links:[{href:'/next',resolved:'https://example.test/next',text:'Next'},{href:'#',resolved:'https://example.test/#',text:'Empty'}],
      buttons:[{text:'Go',disabled:false}],
      forms:[],
      controls:[{name:'q',type:'text',labelled:true}],
    };
    return{title:'Next',links:[],buttons:[],forms:[],controls:[]};
  }
}

test('UI sweep crawls same-origin links and inventories controls',async()=>{
  const page=new FakePage();
  const report=await runUiSweep({page,baseURL:'https://example.test/',maxPages:5});
  assert.equal(report.status,'passed');
  assert.equal(report.pages.length,2);
  assert.equal(report.pages[0].counts.buttons,1);
  assert.equal(report.pages[0].suspiciousLinks.length,1);
  assert.deepEqual(page.visits,['https://example.test/','https://example.test/next']);
});

test('UI sweep fails on navigation errors',async()=>{
  const page=new FakePage();
  page.goto=async url=>{page.current=url;throw new Error('navigation failed')};
  const report=await runUiSweep({page,baseURL:'https://example.test/'});
  assert.equal(report.status,'failed');
  assert.equal(report.failures[0].type,'navigation');
});


test('UI sweep preserves SPA hash routes when requested',async()=>{
  const page=new FakePage();
  const report=await runUiSweep({
    page,
    baseURL:'https://example.test/',
    startPaths:['/#owner','/#portal'],
    maxPages:5,
    preserveHashRoutes:true,
  });
  assert.equal(report.status,'passed');
  assert.deepEqual(
    page.visits.slice(0,2),
    ['https://example.test/#owner','https://example.test/#portal'],
  );
});
