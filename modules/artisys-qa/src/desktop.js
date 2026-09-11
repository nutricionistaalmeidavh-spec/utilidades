import { spawn } from 'node:child_process';

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function runDesktopSmoke({ executable, args = [], cwd, env, startupGraceMs = 1500, shutdownTimeoutMs = 5000, persistenceCheck = null } = {}) {
  if (!executable || typeof executable !== 'string') throw new TypeError('executable is required');
  const startedAt = Date.now();
  const child = spawn(executable, args, { cwd, env: { ...process.env, ...(env || {}) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const logs = [];
  child.stdout?.on('data', chunk => logs.push(chunk.toString()));
  child.stderr?.on('data', chunk => logs.push(chunk.toString()));
  let exit = null;
  child.once('exit', (code, signal) => { exit = { code, signal }; });
  await wait(startupGraceMs);
  if (exit) {
    throw new Error(`Desktop process exited during startup (code=${exit.code}, signal=${exit.signal || 'none'})`);
  }
  if (typeof persistenceCheck === 'function') await persistenceCheck({ child, logs });
  child.kill();
  const deadline = Date.now() + shutdownTimeoutMs;
  while (!exit && Date.now() < deadline) await wait(50);
  if (!exit) child.kill('SIGKILL');
  return { status: 'passed', durationMs: Date.now() - startedAt, exit, logs: logs.join('') };
}
