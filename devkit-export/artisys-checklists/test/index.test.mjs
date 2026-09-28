import test from'node:test';import assert from'node:assert/strict';import{createChecklist,setChecklistItem,checklistProgress}from'../src/index.mjs';
test('tracks checklist progress',()=>{let c=createChecklist({id:'x',items:[{id:'a'},{id:'b'}]});c=setChecklistItem(c,'a',{done:true});assert.deepEqual(checklistProgress(c),{completed:1,total:2,percent:50,done:false})});
