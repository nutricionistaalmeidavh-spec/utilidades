import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveQaProfile, listQaProfiles } from '../src/profiles.js';
import { resolveBusinessPack } from '../src/business-packs.js';
import { aggregateQaReport, writeQaReport, readQaHistory } from '../src/reporting.js';
import { evaluateReleaseGate } from '../src/release-gate.js';
import { retryTransient } from '../src/network.js';
import { runDesktopSmoke } from '../src/desktop.js';

test('profiles expose quick/full/release and allow manifest overrides', () => {
  const manifest = {
    flows: { smoke: 'smoke.js', sale: 'sale.js', cancel: 'cancel.js' },
    qaProfiles: { quick: { flows: ['smoke', 'sale'] } },
  };
  assert.deepEqual(listQaProfiles(manifest), ['quick', 'full', 'release']);
  assert.deepEqual(resolveQaProfile(manifest, 'quick').flows, ['smoke', 'sale']);
  assert.equal(resolveQaProfile(manifest, 'release').critical, true);
});

test('business pack resolves only declared consumer flows', () => {
  const manifest = { flows: { login: 'login.js', sale: 'sale.js', 'cash-open': 'cash-open.js', 'cash-close': 'cash-close.js' } };
  const pack = resolveBusinessPack('commerce', manifest, { strict: false });
  assert.deepEqual(pack.available, ['sale', 'cash-open', 'cash-close']);
  assert.ok(pack.missing.includes('cancel-sale'));
});

test('release gate fails closed and requires auditable override reason', () => {
  const failed = evaluateReleaseGate({ profile: 'release', results: [{ flow: 'sale', status: 'failed', critical: true }] });
  assert.equal(failed.allowed, false);
  const overridden = evaluateReleaseGate({ profile: 'release', results: [{ flow: 'sale', status: 'failed', critical: true }], override: true, overrideReason: 'manual emergency release' });
  assert.equal(overridden.allowed, true);
  assert.equal(overridden.overridden, true);
  assert.throws(() => evaluateReleaseGate({ profile: 'release', results: [{ flow: 'sale', status: 'failed', critical: true }], override: true }), /overrideReason/);
});

test('reporting writes json/html and bounded history', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-qa-report-'));
  try {
    const report = aggregateQaReport({ systemId: 'pdv', profile: 'quick', runs: [{ flow: 'smoke', status: 'passed', durationMs: 12 }] });
    const out = await writeQaReport({ report, outputRoot: root, historyLimit: 2 });
    assert.ok(out.jsonFile.endsWith('report.json'));
    assert.ok(out.htmlFile.endsWith('report.html'));
    const history = await readQaHistory(root);
    assert.equal(history.length, 1);
    assert.equal(history[0].systemId, 'pdv');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('retryTransient retries recoverable failures', async () => {
  let calls = 0;
  const value = await retryTransient(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error('temporary'), { code: 'ECONNRESET' });
    return 'ok';
  }, { attempts: 3, delayMs: 1 });
  assert.equal(value, 'ok');
  assert.equal(calls, 3);
});

test('desktop smoke reports missing executables as a controlled failure', async () => {
  await assert.rejects(
    runDesktopSmoke({ executable: path.join(os.tmpdir(), `missing-artisys-${Date.now()}.exe`), startupGraceMs: 10 }),
    /failed to start/i,
  );
});
