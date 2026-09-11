import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadAgentState, defaultAgentRoot } from './agent-state.js';
import { checkForStableUpdate, AGENT_RESTART_EXIT_CODE } from './agent-updater.js';

const MODULE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI_FILE = path.join(MODULE_DIR, 'src', 'cli.mjs');

export function agentHealthFile(root = defaultAgentRoot()) {
  return path.join(root, 'agent-health.json');
}

export function buildProjectRemoteCommand(project, { node = process.execPath, cliFile = CLI_FILE, root = defaultAgentRoot() } = {}) {
  if (!project?.config) throw new TypeError('project config is required');
  return {
    command: node,
    args: [
      cliFile,
      'remote',
      '--config', project.config,
      '--host', project.host || '0.0.0.0',
      '--port', String(project.port),
      '--token', project.token,
      '--output', path.join(root, 'artifacts', project.id),
    ],
  };
}

export async function writeAgentHealth(health, root = defaultAgentRoot()) {
  await fs.mkdir(root, { recursive: true });
  const file = agentHealthFile(root);
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(health, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
  return file;
}

export async function readAgentHealth(root = defaultAgentRoot()) {
  try {
    return JSON.parse(await fs.readFile(agentHealthFile(root), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function startAgentSupervisor({
  root = defaultAgentRoot(),
  spawnProcess = spawn,
  checkUpdate = checkForStableUpdate,
  reconcileIntervalMs = 10_000,
  exit = code => process.exit(code),
  logger = console,
} = {}) {
  const children = new Map();
  const restartTimers = new Map();
  let stopping = false;
  let reconcileTimer = null;
  let updateTimer = null;
  let version = 'unknown';
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(MODULE_DIR, 'package.json'), 'utf8'));
    version = pkg.version || version;
  } catch {}

  function stopProject(id) {
    const timer = restartTimers.get(id);
    if (timer) clearTimeout(timer);
    restartTimers.delete(id);
    const child = children.get(id);
    children.delete(id);
    if (child && child.exitCode == null && !child.killed) child.kill();
  }

  function startProject(project) {
    if (children.has(project.id) || stopping) return;
    const { command, args } = buildProjectRemoteCommand(project, { root });
    const child = spawnProcess(command, args, {
      cwd: path.dirname(project.config),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    children.set(project.id, child);
    child.stdout?.on('data', chunk => logger.log(`[${project.id}] ${String(chunk).trimEnd()}`));
    child.stderr?.on('data', chunk => logger.error(`[${project.id}] ${String(chunk).trimEnd()}`));
    child.once('error', error => logger.error(`[${project.id}] ${error.message}`));
    child.once('exit', () => {
      children.delete(project.id);
      if (stopping || project.enabled === false) return;
      const timer = setTimeout(() => {
        restartTimers.delete(project.id);
        startProject(project);
      }, 3000);
      restartTimers.set(project.id, timer);
    });
  }

  async function reconcile() {
    const state = await loadAgentState(root);
    const enabled = new Map(state.projects.filter(project => project.enabled !== false).map(project => [project.id, project]));
    for (const id of children.keys()) if (!enabled.has(id)) stopProject(id);
    for (const project of enabled.values()) startProject(project);
    await writeAgentHealth({
      status: 'running',
      pid: process.pid,
      version,
      updatedAt: new Date().toISOString(),
      autoUpdate: state.autoUpdate,
      projects: state.projects.map(project => ({ id: project.id, name: project.name, port: project.port, enabled: project.enabled !== false, running: children.has(project.id) })),
    }, root);
    return state;
  }

  async function updateCycle() {
    const result = await checkUpdate({ root });
    if (result.updated) {
      await writeAgentHealth({ status: 'restarting-for-update', pid: process.pid, version, result, updatedAt: new Date().toISOString() }, root);
      await stop();
      exit(AGENT_RESTART_EXIT_CODE);
    }
    return result;
  }

  async function stop() {
    if (stopping) return;
    stopping = true;
    if (reconcileTimer) clearInterval(reconcileTimer);
    if (updateTimer) clearInterval(updateTimer);
    for (const id of [...restartTimers.keys()]) stopProject(id);
    for (const id of [...children.keys()]) stopProject(id);
    await writeAgentHealth({ status: 'stopped', pid: process.pid, version, updatedAt: new Date().toISOString() }, root).catch(() => {});
  }

  const state = await reconcile();
  const intervalMs = Math.max(5, Number(state.updateIntervalMinutes || 60)) * 60_000;
  reconcileTimer = setInterval(() => { void reconcile().catch(error => logger.error(error)); }, reconcileIntervalMs);
  updateTimer = setInterval(() => { void updateCycle().catch(error => logger.error(error)); }, intervalMs);

  const shutdown = () => { void stop().finally(() => exit(0)); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return { stop, reconcile, updateCycle, children };
}
