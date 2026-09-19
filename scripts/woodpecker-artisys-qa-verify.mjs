#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(repoRoot, 'artifacts');
const logPath = path.join(artifacts, 'artisys-qa-verify.log');
const reportPath = path.join(artifacts, 'artisys-qa-verify-report.json');
fs.mkdirSync(artifacts, { recursive: true });

const command = process.platform === 'win32'
  ? (process.env.ComSpec || process.env.COMSPEC || 'cmd.exe')
  : 'npm';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm.cmd run ci:verify --prefix modules/artisys-qa']
  : ['run', 'ci:verify', '--prefix', 'modules/artisys-qa'];

let result;
try {
  result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  result = { status: 1, stdout: '', stderr: `${error?.stack || error}\n`, error };
}

const stdout = String(result?.stdout || '');
const stderr = String(result?.stderr || '');
const spawnError = result?.error ? `${result.error.stack || result.error}\n` : '';
const output = `${stdout}${stderr}${spawnError}`;
fs.writeFileSync(logPath, output, 'utf8');
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
if (spawnError) process.stderr.write(spawnError);

const exitCode = Number.isInteger(result?.status) ? result.status : 1;
const status = exitCode === 0 ? 'pass' : 'fail';
const excerpt = status === 'fail'
  ? output.split(/\r?\n/).slice(-120).join('\n').trim()
  : null;
const report = {
  schemaVersion: 1,
  status,
  failedStep: status === 'pass' ? null : 'artisys-qa:ci-verify',
  steps: [{
    id: 'artisys-qa:ci-verify',
    status,
    exitCode,
    command: 'npm run ci:verify --prefix modules/artisys-qa',
    stdout: null,
    stderr: excerpt || null,
    durationMs: null,
  }],
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.exitCode = exitCode;
