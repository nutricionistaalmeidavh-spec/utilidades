import { createQaConfig } from '../../src/config.js';
import { fileURLToPath } from 'node:url';
export default createQaConfig({
  baseURL: 'http://127.0.0.1:4179',
  testDir: '.',
  testMatch: '**/*.spec.js',
  workers: 1,
  webServer: {
    command: 'node server.js',
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    url: 'http://127.0.0.1:4179/health',
    reuseExistingServer: false,
  },
});
