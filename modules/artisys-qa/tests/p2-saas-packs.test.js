import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_PACKS, listBusinessPacks, resolveBusinessPack } from '../src/business-packs.js';

test('P2 exposes SaaS, licensing and multitenancy packs',()=>{
  for(const name of ['saas','licensing','multitenancy'])assert.ok(listBusinessPacks().includes(name),name);
  assert.deepEqual(BUSINESS_PACKS.licensing,['licenciamento']);
  assert.deepEqual(BUSINESS_PACKS.multitenancy,['multitenancy']);
});

test('P2 SaaS pack resolves against a compatible consumer manifest',()=>{
  const manifest={flows:{smoke:'a.json',auth:'b.json',multitenancy:'c.json',licenciamento:'d.json'}};
  const pack=resolveBusinessPack('saas',manifest);
  assert.deepEqual(pack.missing,[]);
  assert.deepEqual(pack.available,['smoke','auth','multitenancy']);
  assert.deepEqual(resolveBusinessPack('licensing',manifest).available,['licenciamento']);
});
