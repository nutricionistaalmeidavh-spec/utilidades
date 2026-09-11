// Example only: PDV-ARTISYS must supply the real validation-mode commands in its E56 integration.
// This file demonstrates the reusable profile boundary; it is not executed by this module's CI.

const installDir = process.env.ARTISYS_PDV_INSTALL_DIR || 'C:\\Program Files\\ArtiSys PDV';
const installer = process.env.ARTISYS_PDV_INSTALLER || 'dist\\ArtiSys-PDV-x64-Setup.exe';
const workspace = process.env.ARTISYS_VALIDATION_WORKSPACE || 'C:\\Temp\\artisys-pdv-release-validation';

export default {
  profile: {
    schemaVersion: 1,
    product: 'PDV-ARTISYS',
    version: process.env.ARTISYS_PDV_VERSION || '0.0.0-example',
    artifact: installer,
    workspace,
    reportDir: `${workspace}\\reports`,
    phases: [
      {
        id: 'install',
        timeoutMs: 180_000,
        action: { type: 'nsis-install', installDir }
      },
      {
        id: 'boot-health',
        action: {
          type: 'http',
          url: 'http://127.0.0.1:4174/api/v1/health',
          expectedStatus: [200]
        }
      },
      {
        id: 'business-scenarios',
        action: { type: 'scenarios' }
      },
      {
        id: 'uninstall',
        action: {
          type: 'nsis-uninstall',
          uninstaller: `${installDir}\\Uninstall ArtiSys PDV.exe`
        }
      }
    ],
    scenarios: [
      {
        id: 'pdv-domain-smoke-placeholder',
        action: {
          type: 'command',
          file: process.execPath,
          args: ['scripts\\e56-release-smoke.mjs']
        }
      },
      {
        id: 'pdv-stress-placeholder',
        repeat: 1000,
        action: {
          type: 'command',
          file: process.execPath,
          args: ['scripts\\e56-one-stress-iteration.mjs']
        }
      }
    ]
  }
};
