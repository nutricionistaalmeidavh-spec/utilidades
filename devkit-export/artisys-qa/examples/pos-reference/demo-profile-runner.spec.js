import { test, expect } from 'playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runQaFlow } from '../../src/runner.js';

// The reference test executes the QA runner inside Playwright Test. Disable the
// outer runner capture so the inner QA runner owns tracing/video end-to-end.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('runner prepares demo profile and passes adapter capabilities without leaking secrets', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-qa-runner-profile-'));
  const htmlFile = path.join(dir, 'index.html');
  const flowFile = path.join(dir, 'flow.json');
  await fs.writeFile(htmlFile, '<!doctype html><html><body><div id="status">logged-out</div></body></html>', 'utf8');
  await fs.writeFile(flowFile, JSON.stringify({
    steps: [
      { uses: 'common/login' },
      { action: 'expectText', selector: '#status', expected: 'logged-in' },
    ],
  }), 'utf8');

  const previousUser = process.env.DEMO_USER;
  const previousPass = process.env.DEMO_PASS;
  process.env.DEMO_USER = 'demo@example.test';
  process.env.DEMO_PASS = 'ARTISYS_TEST_SECRET_9f4c';

  const demoProfile = {
    name: 'default',
    account: { usernameEnv: 'DEMO_USER', passwordEnv: 'DEMO_PASS' },
    workspace: { strategy: 'ephemeral', resetBeforeRun: null },
    fixtures: [],
  };
  let authenticated = false;
  const demoAdapter = {
    authenticateDemoAccount: async ({ credentials }) => {
      expect(credentials.username).toBe('demo@example.test');
      expect(credentials.password).toBe('ARTISYS_TEST_SECRET_9f4c');
      authenticated = true;
    },
    ensureDemoWorkspace: async () => ({ id: 'workspace-demo', demo: true }),
    capabilities: {
      'auth.login': async ({ page, runtimeContext }) => {
        expect(runtimeContext.credentials.password).toBe('ARTISYS_TEST_SECRET_9f4c');
        await page.locator('#status').evaluate(node => { node.textContent = 'logged-in'; });
      },
    },
  };

  try {
    const result = await runQaFlow({
      manifest: {
        schemaVersion: 1,
        systemId: 'profile-runner-reference',
        mode: 'web',
        headless: true,
        capture: { video: false, screenshotEachStep: false },
      },
      rootDir: dir,
      environmentName: 'ci',
      environment: { baseURL: pathToFileURL(htmlFile).href },
      flowName: 'profile-flow',
      flowFile,
      viewport: { name: 'desktop', width: 900, height: 700 },
      outputRoot: path.join(dir, 'artifacts'),
      demoProfile,
      demoAdapter,
    });

    expect(authenticated).toBe(true);
    expect(result.summary.status).toBe('passed');
    expect(result.summary.demoProfile.profile).toBe('default');
    expect(JSON.stringify(result.summary)).not.toContain('ARTISYS_TEST_SECRET_9f4c');

    for (const file of ['run-summary.json', 'telemetry.json']) {
      const emitted = await fs.readFile(path.join(result.outputDir, file), 'utf8');
      expect(emitted).not.toContain('ARTISYS_TEST_SECRET_9f4c');
    }
  } finally {
    if (previousUser == null) delete process.env.DEMO_USER; else process.env.DEMO_USER = previousUser;
    if (previousPass == null) delete process.env.DEMO_PASS; else process.env.DEMO_PASS = previousPass;
  }
});
