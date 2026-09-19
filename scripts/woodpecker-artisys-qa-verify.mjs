#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = path.join(repoRoot, 'artifacts');
const logPath = path.join(artifacts, 'artisys-qa-verify.log');
const reportPath = path.join(artifacts, 'artisys-qa-verify-report.json');
fs.mkdirSync(artifacts, { recursive: true });
fs.writeFileSync(logPath, '', 'utf8');

const lines = [];
function record(chunk, stream) {
  const text = String(chunk ?? '');
  if (!text) return;
  stream.write(text);
  fs.appendFileSync(logPath, text, 'utf8');
  lines.push(...text.split(/\r?\n/));
  if (lines.length > 300) lines.splice(0, lines.length - 300);
}

const command = process.platform === 'win32'
  ? (process.env.ComSpec || 'cmd.exe')
  : 'npm';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm.cmd run ci:verify --prefix modules/artisys-qa']
  : ['run', 'ci:verify', '--prefix', 'modules/artisys-qa'];

const child = spawn(command, args, {
  cwd: repoRoot,
  env: process.env,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', chunk => record(chunk, process.stdout));
child.stderr.on('data', chunk => record(chunk, process.stderr));

child.on('error', error => {
  record(`${error.stack || error.message}\n`, process.stderr);
});

child.on('close', (code, signal) => {
  const exitCode = Number.isInteger(code) ? code : 1;
  const status = exitCode === 0 ? 'pass' : 'fail';
  const excerpt = status === 'fail' ? lines.slice(-120).join('\n').trim() : null;
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
      stderr: excerpt || (signal ? `Process terminated by ${signal}` : null),
      durationMs: null,
    }],
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.exitCode = exitCode;
});
