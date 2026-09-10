import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQaManifest, resolveEnvironment, resolveViewport } from '../src/manifest.js';

const webManifest = {
  schemaVersion: 1,
  systemId: 'sample',
  mode: 'web',
  defaultEnvironment: 'prod',
  defaultViewport: 'desktop',
  environments: { prod: { baseURL: 'https://example.com' } },
  flows: { smoke: 'flows/smoke.json' },
};

test('validates reusable web manifest and resolves defaults', () => {
  assert.equal(validateQaManifest(webManifest), true);
  assert.equal(resolveEnvironment(webManifest).name, 'prod');
  assert.deepEqual(resolveViewport(webManifest), { name: 'desktop', width: 1440, height: 900 });
});

test('validates electron contract', () => {
  const electronManifest = {
    ...webManifest,
    mode: 'electron',
    electron: { entry: '../desktop/main.cjs' },
    environments: { ci: {} },
  };
  assert.equal(validateQaManifest(electronManifest), true);
  assert.throws(() => validateQaManifest({ ...electronManifest, electron: {} }), /electron.entry/);
});

test('rejects unknown viewport and empty flows', () => {
  assert.throws(() => validateQaManifest({ ...webManifest, defaultViewport: 'watch' }), /Unknown viewport/);
  assert.throws(() => validateQaManifest({ ...webManifest, flows: {} }), /flow/);
});
