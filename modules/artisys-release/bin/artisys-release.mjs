#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createJsonReport, runPipeline } from '../src/index.mjs';

function parseArgs(argv) {
  const args = { configPath: null, profile: null, reportPath: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!args.configPath && !token.startsWith('--')) { args.configPath = token; continue; }
    if (token === '--profile') { args.profile = argv[++i]; continue; }
    if (token === '--report') { args.reportPath = argv[++i]; continue; }
    if (token === '--dry-run') { args.dryRun = true; continue; }
    if (token === '--help' || token === '-h') { args.help = true; continue; }
    throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

function usage() {
  return [
    'Usage: artisys-release <config.json> [--profile quick|full|release] [--report file.json] [--dry-run]',
    '',
    'The config owns product-specific commands; the same file can run locally, in act, CircleCI or Woodpecker.',
  ].join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) { console.log(usage()); return 0; }
  if (!args.configPath) throw new Error(usage());

  const configPath = path.resolve(args.configPath);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (args.profile) config.profile = args.profile;
  const configDir = path.dirname(configPath);
  if (config.workspace) config.workspace = path.resolve(configDir, config.workspace);
  else config.workspace = path.basename(configDir) === '.artisys' ? path.resolve(configDir, '..') : configDir;

  const result = await runPipeline(config, {
    dryRun: args.dryRun,
    onStepStart: (step) => console.log(`[artisys-release] ${step.id}: ${step.command}`),
  });
  const report = createJsonReport(result);
  const reportPath = path.resolve(args.reportPath ?? config.reportPath ?? 'artifacts/artisys-release-report.json');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report, 'utf8');

  for (const step of result.steps) console.log(`${step.status.padEnd(8)} ${step.id}${step.exitCode === null ? '' : ` (exit ${step.exitCode})`}`);
  console.log(`report: ${reportPath}`);
  console.log(`status: ${result.status}`);
  return result.status === 'pass' ? 0 : 1;
}

// This file is the package bin entrypoint. The reusable API is exported from
// src/index.mjs, so the bin must always execute main() when Node launches it.
main().then((code) => { process.exitCode = code; }).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
