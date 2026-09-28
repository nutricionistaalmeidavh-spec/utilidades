import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQaManifest, resolveEnvironment, resolveViewport, resolveDemo, resolveDemoPreset } from '../src/manifest.js';

const webManifest = {
  schemaVersion: 1,
  systemId: 'sample',
  mode: 'web',
  defaultEnvironment: 'prod',
  defaultViewport: 'desktop',
  environments: { prod: { baseURL: 'https://example.com' } },
  flows: { smoke: 'flows/smoke.json' },
  demos: {
    'quick-30s': { file: 'demo/quick-30s.json', preset: 'reels-9x16', durationTargetSec: 30 },
  },
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

test('resolves reusable demo and social preset', () => {
  const demo = resolveDemo(webManifest, 'quick-30s', '/tmp/qa');
  assert.equal(demo.name, 'quick-30s');
  assert.equal(demo.preset, 'reels-9x16');
  assert.equal(demo.durationTargetSec, 30);
  assert.match(demo.file, /quick-30s\.json$/);
  assert.deepEqual(resolveDemoPreset('reels-9x16'), {
    name: 'reels-9x16', width: 1080, height: 1920, captureViewport: { width: 1080, height: 1920 }
  });
});

test('accepts demo-only manifests and rejects invalid configuration', () => {
  const demoOnly = { ...webManifest, flows: undefined };
  assert.equal(validateQaManifest(demoOnly), true);
  assert.throws(() => validateQaManifest({ ...webManifest, defaultViewport: 'watch' }), /Unknown viewport/);
  assert.throws(() => validateQaManifest({ ...webManifest, flows: {}, demos: {} }), /flow or demo/);
  assert.throws(() => validateQaManifest({ ...webManifest, demos: { bad: { file: 'x.json', preset: 'story' } } }), /Unknown demo preset/);
  assert.throws(() => resolveDemo(webManifest, 'missing', '/tmp/qa'), /Unknown demo/);
});
