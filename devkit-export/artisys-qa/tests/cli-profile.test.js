import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

test('demo-profile status resolves adapter and never prints credentials', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-qa-profile-'));
  const adapterFile = path.join(dir, 'adapter.mjs');
  const configFile = path.join(dir, 'qa.json');
  await fs.writeFile(adapterFile, `export default {
    getDemoProfileStatus: async ({ credentials }) => ({ ready: true, observedPassword: credentials.password })
  };\n`, 'utf8');
  await fs.writeFile(configFile, JSON.stringify({
    schemaVersion: 1,
    systemId: 'cli-profile-test',
    mode: 'web',
    defaultDemoProfile: 'default',
    environments: { ci: { baseURL: 'https://example.test' } },
    flows: { smoke: 'unused.json' },
    demoProfiles: {
      default: {
        adapter: './adapter.mjs',
        account: { usernameEnv: 'DEMO_USER', passwordEnv: 'DEMO_PASS' },
        workspace: { strategy: 'persistent' },
      },
    },
  }, null, 2), 'utf8');

  const result = spawnSync(process.execPath, [cli, 'demo-profile', 'status', '--config', configFile, '--profile', 'default'], {
    encoding: 'utf8',
    env: { ...process.env, DEMO_USER: 'demo@example.test', DEMO_PASS: 'ARTISYS_TEST_SECRET_9f4c' },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"profile": "default"/);
  assert.match(result.stdout, /"ready": true/);
  assert.doesNotMatch(result.stdout, /ARTISYS_TEST_SECRET_9f4c/);
});
