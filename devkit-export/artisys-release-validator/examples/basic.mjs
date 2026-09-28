import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { validateRelease } from '../src/index.mjs';

const workspace = await mkdtemp(path.join(os.tmpdir(), 'artisys-release-validator-example-'));
try {
  const artifact = path.join(workspace, 'demo-artifact.bin');
  await writeFile(artifact, 'ArtiSys release validator example');

  const result = await validateRelease({
    profile: {
      schemaVersion: 1,
      product: 'ArtiSys Validator Demo',
      version: '0.1.0',
      artifact,
      workspace,
      reportDir: path.join(workspace, 'reports'),
      phases: [
        {
          id: 'boot-smoke',
          action: {
            type: 'command',
            file: process.execPath,
            args: ['-e', "process.stdout.write('demo-ok')"]
          }
        },
        {
          id: 'stress-smoke',
          repeat: 3,
          action: {
            type: 'command',
            file: process.execPath,
            args: ['-e', 'process.exit(0)']
          }
        }
      ]
    }
  });

  console.log(`${result.product} ${result.version}: ${result.status}`);
  console.log(`SHA-256: ${result.artifact.sha256}`);
  if (result.status !== 'APPROVED') process.exitCode = 1;
} finally {
  await rm(workspace, { recursive: true, force: true });
}
