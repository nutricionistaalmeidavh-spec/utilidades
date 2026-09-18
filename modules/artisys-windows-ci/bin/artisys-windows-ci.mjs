#!/usr/bin/env node
import { assertTrustedElevatedContext, DEFAULT_TRUSTED_REPOSITORIES } from '../src/index.mjs';

const command = process.argv[2] || 'verify-elevated';

if (command === 'print-allowlist') {
  for (const repository of DEFAULT_TRUSTED_REPOSITORIES) console.log(repository);
  process.exit(0);
}

if (command !== 'verify-elevated') {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}

try {
  const result = assertTrustedElevatedContext(process.env);
  console.log(`[ArtiSys Windows CI] elevated context verified for ${result.repository}; event=${result.event || 'unknown'}`);
} catch (error) {
  console.error(`[ArtiSys Windows CI] ${error.message}`);
  process.exit(1);
}
