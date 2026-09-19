import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

test('utilidades Woodpecker self-CI validates shared modules and always reports failures', () => {
  const workflow = fs.readFileSync(path.join(root, '.woodpecker', 'artisys-release.yaml'), 'utf8');
  const wrapper = fs.readFileSync(path.join(root, 'scripts', 'run-woodpecker-self-ci.ps1'), 'utf8');
  const release = JSON.parse(fs.readFileSync(path.join(root, '.artisys', 'release.json'), 'utf8'));

  assert.equal(release.profile, 'full');
  for (const required of ['deps', 'lint', 'test', 'build', 'qa', 'security']) {
    assert.ok(release.requiredSteps.includes(required), `missing required step ${required}`);
  }
  assert.match(release.steps.deps, /artisys-qa/);
  assert.match(release.steps.deps, /npm ci/);
  assert.match(release.steps.build, /artisys-ci-reporter/);
  assert.match(release.steps.qa, /artisys-qa/);
  assert.match(release.steps.security, /artisys-security/);

  assert.match(workflow, /woodpecker-release\.log/);
  assert.match(workflow, /run-woodpecker-self-ci\.ps1/);
  assert.match(wrapper, /'--profile',\s*'full'/);
  assert.match(workflow, /reportar-falha-github/);
  assert.match(workflow, /ARTISYS_CI_RESULT:\s*'failure'/);
  assert.match(workflow, /status:\s*\[failure\]/);
});
