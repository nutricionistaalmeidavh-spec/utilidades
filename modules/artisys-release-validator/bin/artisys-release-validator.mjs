#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateRelease } from '../src/index.mjs';

async function main(argv = process.argv.slice(2)) {
  const configPath = argv[0];
  if (!configPath) throw new Error('Usage: artisys-release-validator <profile.mjs>');
  const loaded = await import(pathToFileURL(path.resolve(configPath)).href);
  let config = loaded.default ?? loaded;
  if (typeof config === 'function') config = await config();
  if (!config || typeof config !== 'object' || !config.profile) {
    throw new TypeError('profile module must export { profile, executePhase? }');
  }
  const result = await validateRelease({
    profile: config.profile,
    executePhase: config.executePhase ?? null
  });
  console.log(`ArtiSys Release Validator: ${result.status}`);
  console.log(JSON.stringify({
    status: result.status,
    product: result.product,
    version: result.version,
    artifact: result.artifact,
    failedRequired: result.failedRequired,
    reports: result.reports
  }, null, 2));
  return result.status === 'APPROVED' ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath && import.meta.url === invokedPath) {
  main()
    .then(code => { process.exitCode = code; })
    .catch(error => {
      console.error(error?.message || error);
      process.exitCode = 2;
    });
}

export { main };
