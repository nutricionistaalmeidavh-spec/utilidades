import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateQaManifest } from '../src/manifest.js';
import { resolveQaProfile } from '../src/profiles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, '..');
const templateRoot = path.join(moduleRoot, 'templates', 'web-saas');

async function readJson(relative) {
  return JSON.parse(await fs.readFile(path.join(templateRoot, relative), 'utf8'));
}

test('web SaaS template exposes a valid web manifest with quick/full/release profiles', async () => {
  const manifest = await readJson('artisys-qa.config.json');
  assert.equal(validateQaManifest(manifest), true);
  assert.equal(manifest.mode, 'web');
  assert.equal(manifest.defaultEnvironment, 'local');
  assert.equal(manifest.capture.video, true);
  assert.equal(manifest.capture.screenshotEachStep, true);

  for (const name of ['quick', 'full', 'release']) {
    const profile = resolveQaProfile(manifest, name);
    assert.ok(profile.flows.length > 0, `${name} must contain at least one flow`);
  }
});

test('web SaaS template smoke flow is declarative and read-only', async () => {
  const flow = await readJson('flows/00-smoke.json');
  assert.equal(flow.name, '00-smoke');
  assert.ok(Array.isArray(flow.steps));
  assert.ok(flow.steps.some(step => step.action === 'expectVisible'));
  assert.ok(flow.steps.some(step => step.action === 'screenshot'));
  assert.equal(flow.steps.some(step => ['fill', 'check', 'uncheck', 'selectOption'].includes(step.action)), false);
});
