import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { managedProjectsRoot, normalizeManagedProject } from '../src/project-bootstrap.js';

test('managed project registry accepts only owner repositories and safe relative config paths', () => {
  const project = normalizeManagedProject({
    id: 'PDV Nexus',
    name: 'PDV Nexus',
    repository: 'https://github.com/nutricionistaalmeidavh-spec/PDVNexus',
    ref: 'main',
    configPath: 'qa/artisys-qa.config.json',
    setup: 'npm-ci',
  });
  assert.equal(project.id, 'pdv-nexus');
  assert.equal(project.repository, 'https://github.com/nutricionistaalmeidavh-spec/PDVNexus.git');
  assert.equal(project.setup, 'npm-ci');

  assert.throws(() => normalizeManagedProject({
    id: 'foreign',
    repository: 'https://github.com/another-owner/repo.git',
  }), /not allowed/);

  assert.throws(() => normalizeManagedProject({
    id: 'escape',
    repository: 'https://github.com/nutricionistaalmeidavh-spec/repo.git',
    configPath: '../secret.json',
  }), /invalid managed project configPath/);
});

test('managed project checkout root stays inside the agent root', () => {
  const root = path.resolve('agent-root');
  assert.equal(managedProjectsRoot(root), path.join(root, 'projects'));
});

test('managed project setup is a fixed whitelist, never an arbitrary shell command', () => {
  const withoutLock = normalizeManagedProject({
    id: 'pdv-artisys',
    repository: 'https://github.com/nutricionistaalmeidavh-spec/PDV-ARTISYS.git',
    setup: 'npm-install',
  });
  assert.equal(withoutLock.setup, 'npm-install');

  assert.throws(() => normalizeManagedProject({
    id: 'unsafe',
    repository: 'https://github.com/nutricionistaalmeidavh-spec/repo.git',
    setup: 'powershell -Command whoami',
  }), /unsupported managed project setup/);
});

test('managed checkout initializes repository submodules before package setup', () => {
  const source = fs.readFileSync(new URL('../src/project-bootstrap.js', import.meta.url), 'utf8');
  const syncIndex = source.indexOf("['submodule', 'sync', '--recursive']");
  const updateIndex = source.indexOf("['submodule', 'update', '--init', '--recursive']");
  const setupIndex = source.indexOf('await runSetup(definition, destination)');
  assert.ok(syncIndex >= 0, 'submodule sync must be present');
  assert.ok(updateIndex > syncIndex, 'submodule update must run after sync');
  assert.ok(setupIndex > updateIndex, 'package setup must run after submodules are ready');
});
