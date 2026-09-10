import { defineConfig, devices } from 'playwright/test';

/** Product owns server lifecycle, authentication and scenario selection. */
export function createQaConfig({ baseURL, testDir = './e2e', webServer, workers = 2, ...overrides } = {}) {
  if (!baseURL || !['http:', 'https:'].includes(new URL(baseURL).protocol)) throw new TypeError('An HTTP(S) baseURL is required');
  const { use, ...rest } = overrides;
  return defineConfig({
    testDir,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers,
    timeout: 30000,
    expect: { timeout: 5000 },
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'qa-report' }]],
    outputDir: 'qa-results',
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer,
    ...rest,
    use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off', ...use },
  });
}
