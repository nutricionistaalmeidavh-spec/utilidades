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
  return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
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

async function confirmActivation(state, execution) {
  const pending = state.lastUpdateResult?.status === 'activated';
  const deadline = Date.now() + (pending ? 20_000 : 12_000);
  while (Date.now() < deadline) {
    if (execution.getExit()) return false;
    try {
      const health = await readJson(healthFile);
      if (health.status === 'running' && Number(health.pid) === Number(execution.child.pid)) {
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
  let exitResult = null;
  const completion = new Promise(resolve => {
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      exitResult = result;
      resolve(result);
    };
    child.once('exit', (code, signal) => finish({ code, signal }));
    child.once('error', error => finish({ code: 1, error }));
  });
  return { child, completion, getExit: () => exitResult };
}

let stopping = false;
let currentChild = null;
const stop = () => {
  stopping = true;
  if (currentChild && currentChild.exitCode == null && !currentChild.killed) currentChild.kill();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

while (!stopping) {
  let state;
  try {
    state = await readState();
    const execution = await runSlot(state);
    currentChild = execution.child;
    const healthy = await confirmActivation(state, execution);
    if (!healthy && state.lastUpdateResult?.status === 'activated') {
      if (execution.child.exitCode == null && !execution.child.killed) execution.child.kill();
      await execution.completion.catch(() => {});
      currentChild = null;
      await rollback(await readState(), 'new agent slot failed startup health check');
      await wait(1000);
      continue;
    }

    const exit = await execution.completion;
    currentChild = null;
    if (stopping) break;
    if (exit.code === RESTART_EXIT_CODE) {
      await wait(500);
      continue;
    }
    await wait(3000);
  } catch (error) {
    currentChild = null;
    console.error(`ArtiSys QA bootstrap: ${error?.message || error}`);
    try {
      const current = state || await readState();
      if (current.lastUpdateResult?.status === 'activated' && await rollback(current, error?.message || 'bootstrap failure')) {
        await wait(1000);
        continue;
      }
    } catch {}
    if (!stopping) await wait(5000);
  }
}
