#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RESTART_EXIT_CODE = 75;
const bootstrapFile = fileURLToPath(import.meta.url);
const root = process.env.ARTISYS_QA_AGENT_ROOT || path.dirname(bootstrapFile);
const stateFile = path.join(root, 'agent-state.json');
const healthFile = path.join(root, 'agent-health.json');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
}

async function readState() {
  return readJson(stateFile);
}

async function rollback(state, reason) {
  if (!state.previousSlot || state.previousSlot === state.activeSlot) return false;
  const failedSlot = state.activeSlot;
  state.activeSlot = state.previousSlot;
  state.previousSlot = failedSlot;
  state.lastUpdateResult = {
    status: 'rolled-back',
    failedSlot,
    activeSlot: state.activeSlot,
    reason,
    rolledBackAt: new Date().toISOString(),
  };
  await writeJsonAtomic(stateFile, state);
  return true;
}

async function confirmActivation(state, child) {
  const pending = state.lastUpdateResult?.status === 'activated';
  const deadline = Date.now() + (pending ? 20_000 : 12_000);
  while (Date.now() < deadline) {
    if (child.exitCode != null) return false;
    try {
      const health = await readJson(healthFile);
      if (health.status === 'running' && Number(health.pid) === Number(child.pid)) {
        if (pending) {
          const latest = await readState();
          if (latest.activeSlot === state.activeSlot && latest.lastUpdateResult?.status === 'activated') {
            latest.lastUpdateResult = { ...latest.lastUpdateResult, status: 'healthy', healthyAt: new Date().toISOString() };
            await writeJsonAtomic(stateFile, latest);
          }
        }
        return true;
      }
    } catch {}
    await wait(500);
  }
  return false;
}

async function runSlot(state) {
  const cli = path.join(root, 'slots', state.activeSlot, 'modules', 'artisys-qa', 'src', 'agent-cli.mjs');
  await fs.access(cli);
  const child = spawn(process.execPath, [cli, 'run', '--root', root], {
    cwd: root,
    env: { ...process.env, ARTISYS_QA_AGENT_ROOT: root },
    windowsHide: true,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return child;
}

let stopping = false;
const stop = () => { stopping = true; };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

while (!stopping) {
  let state;
  try {
    state = await readState();
    const child = await runSlot(state);
    const healthy = await confirmActivation(state, child);
    if (!healthy && state.lastUpdateResult?.status === 'activated') {
      if (child.exitCode == null) child.kill();
      await rollback(await readState(), 'new agent slot failed startup health check');
      await wait(1000);
      continue;
    }

    const exit = await new Promise(resolve => {
      child.once('exit', (code, signal) => resolve({ code, signal }));
      child.once('error', error => resolve({ code: 1, error }));
    });

    if (stopping) break;
    if (exit.code === RESTART_EXIT_CODE) {
      await wait(500);
      continue;
    }
    await wait(3000);
  } catch (error) {
    console.error(`ArtiSys QA bootstrap: ${error?.message || error}`);
    try {
      const current = state || await readState();
      if (current.lastUpdateResult?.status === 'activated' && await rollback(current, error?.message || 'bootstrap failure')) {
        await wait(1000);
        continue;
      }
    } catch {}
    await wait(5000);
  }
}
