#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.env.ARTISYS_QA_AGENT_ROOT || path.dirname(fileURLToPath(import.meta.url));
const [surface = 'qa', ...forward] = process.argv.slice(2);
if (!['qa', 'agent'].includes(surface)) {
  console.error('Usage: launcher.mjs qa|agent [...args]');
  process.exit(2);
}

try {
  const stateText = (await fs.readFile(path.join(root, 'agent-state.json'), 'utf8')).replace(/^\uFEFF/, '');
  const state = JSON.parse(stateText);
  const entry = surface === 'agent' ? 'agent-cli.mjs' : 'cli.mjs';
  const target = path.join(root, 'slots', state.activeSlot || 'slot-a', 'modules', 'artisys-qa', 'src', entry);
  await fs.access(target);
  const child = spawn(process.execPath, [target, ...forward], {
    cwd: process.cwd(),
    env: { ...process.env, ARTISYS_QA_AGENT_ROOT: root },
    stdio: 'inherit',
    windowsHide: false,
  });
  child.once('error', error => {
    console.error(error?.message || String(error));
    process.exit(1);
  });
  child.once('exit', (code, signal) => {
    if (signal) {
      console.error(`ArtiSys QA child exited by signal ${signal}`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
} catch (error) {
  console.error(`ArtiSys QA launcher: ${error?.message || error}`);
  process.exit(1);
}
