import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('shared CI verification installs locked dependencies before tests', () => {
  const script = String(pkg.scripts?.['ci:verify'] || '');
  assert.ok(script, 'package.json deve expor scripts.ci:verify');
  const installIndex = script.indexOf('npm ci');
  const testIndex = script.indexOf('npm test');
  const checkIndex = script.indexOf('npm run check');
  assert.ok(installIndex >= 0, 'ci:verify deve executar npm ci');
  assert.ok(testIndex > installIndex, 'npm test deve executar depois de npm ci');
  assert.ok(checkIndex > testIndex, 'npm run check deve executar depois dos testes');
  assert.match(script, /--no-audit/);
  assert.match(script, /--no-fund/);
});
