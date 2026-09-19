import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('utilidades self CI preserves bootstrap stdout/stderr for the reporter', async () => {
  const workflow = await readRepoFile('.woodpecker/artisys-release.yaml');
  const wrapper = await readRepoFile('scripts/run-woodpecker-self-ci.ps1');

  assert.match(workflow, /run-woodpecker-self-ci\.ps1/);
  assert.doesNotMatch(workflow, /artisys-release\.mjs .*2>&1 \| ForEach-Object/);
  assert.match(workflow, /ARTISYS_REPORT_PATH:\s*'.*artisys-release-report\.json'/);
  assert.match(workflow, /ARTISYS_LOG_PATH:\s*'.*woodpecker-release\.log'/);
  assert.match(workflow, /ARTISYS_INSTALLER_REQUIRED:\s*'false'/);

  assert.match(wrapper, /Start-Process/);
  assert.match(wrapper, /RedirectStandardOutput/);
  assert.match(wrapper, /RedirectStandardError/);
  assert.match(wrapper, /failedStep = 'bootstrap'/);
  assert.match(wrapper, /release-report-not-generated/);
  assert.match(wrapper, /artisys-release\.stdout\.log/);
  assert.match(wrapper, /artisys-release\.stderr\.log/);
});
