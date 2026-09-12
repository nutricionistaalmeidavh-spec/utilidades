import test from'node:test';import assert from'node:assert/strict';import{resolveFeatureFlag,isFeatureEnabled}from'../src/index.mjs';
test('user overrides tenant and defaults',()=>{const c={defaults:{x:false},tenantFlags:{x:true},userFlags:{x:false}};assert.equal(resolveFeatureFlag('x',c),false);assert.equal(isFeatureEnabled('x',c),false)});
