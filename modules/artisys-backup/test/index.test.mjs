import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupManifest, verifyBackupManifest } from '../src/index.mjs';

test('creates deterministic manifest and verifies integrity', () => {
  const files = {'db.sqlite':'abc','config.json':'{}'};
  const manifest = createBackupManifest(files,{createdAt:'2026-09-12T00:00:00Z'});
  assert.equal(manifest.entries.length,2);
  assert.equal(verifyBackupManifest(files,manifest).valid,true);
  assert.equal(verifyBackupManifest({...files,'db.sqlite':'changed'},manifest).valid,false);
});
