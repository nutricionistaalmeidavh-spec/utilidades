import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupManifest, verifyBackupManifest, selectBackupRetention, isBackupDue } from '../src/index.mjs';

test('creates deterministic manifest and verifies integrity', () => {
  const files = {'db.sqlite':'abc','config.json':'{}'};
  const manifest = createBackupManifest(files,{createdAt:'2026-09-12T00:00:00Z'});
  assert.equal(manifest.entries.length,2);
  assert.equal(verifyBackupManifest(files,manifest).valid,true);
  assert.equal(verifyBackupManifest({...files,'db.sqlite':'changed'},manifest).valid,false);
});

test('selects newest backups for retention', () => {
  const backups = [
    {id:'a',createdAt:'2026-09-10T00:00:00Z'},
    {id:'c',createdAt:'2026-09-12T00:00:00Z'},
    {id:'b',createdAt:'2026-09-11T00:00:00Z'}
  ];
  const retention = selectBackupRetention(backups,{keepLast:2});
  assert.deepEqual(retention.keep.map(x=>x.id),['c','b']);
  assert.deepEqual(retention.prune.map(x=>x.id),['a']);
});

test('computes scheduled backup due state', () => {
  assert.equal(isBackupDue({lastBackupAt:null,now:'2026-09-13T10:00:00Z',intervalMs:3600000}),true);
  assert.equal(isBackupDue({lastBackupAt:'2026-09-13T09:30:00Z',now:'2026-09-13T10:00:00Z',intervalMs:3600000}),false);
  assert.equal(isBackupDue({lastBackupAt:'2026-09-13T08:30:00Z',now:'2026-09-13T10:00:00Z',intervalMs:3600000}),true);
});
