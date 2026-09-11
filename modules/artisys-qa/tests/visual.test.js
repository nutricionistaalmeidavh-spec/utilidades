import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  isVisualValidationRequested,
  sanitizeVisualName,
  validateVisualSnapshot,
} from '../src/visual.js';

test('visual validation is opt-in', async () => {
  assert.equal(isVisualValidationRequested(undefined), false);
  assert.equal(isVisualValidationRequested(false), false);
  assert.equal(isVisualValidationRequested('0'), false);
  assert.equal(isVisualValidationRequested('1'), true);
  assert.equal(isVisualValidationRequested('true'), true);

  const result = await validateVisualSnapshot({ requested: false });
  assert.deepEqual(result, { status: 'skipped', reason: 'visual-validation-not-requested' });
});

test('visual snapshot names are filesystem-safe', () => {
  assert.equal(sanitizeVisualName('Checkout / Caixa #1'), 'checkout-caixa-1');
  assert.throws(() => sanitizeVisualName('   '), /name is required/);
});

test('reviewed baseline can be created explicitly', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-qa-visual-'));
  const baselineDir = path.join(root, 'baselines');
  const page = {
    evaluate() {},
    async screenshot() { return Buffer.from('fake-png'); },
  };

  try {
    const result = await validateVisualSnapshot({
      page,
      name: 'dashboard',
      requested: true,
      updateBaseline: true,
      baselineDir,
      artifactDir: path.join(root, 'artifacts'),
    });

    assert.equal(result.status, 'baseline-created');
    assert.equal(await fs.readFile(path.join(baselineDir, 'dashboard.png'), 'utf8'), 'fake-png');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
