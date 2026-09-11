import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultAgentRoot, loadAgentState, saveAgentState } from './agent-state.js';
import { listPendingBridgeJobs, loadProcessedJobs, markBridgeJobProcessed, validateBridgeJob } from './bridge-jobs.js';
import { uploadRunArtifacts } from './drive-uploader.js';

const MODULE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(MODULE_DIR, '..', '..');
const CLI_FILE = path.join(MODULE_DIR, 'src', 'cli.mjs');
export const DEFAULT_DRIVE_ROOT_FOLDER_ID = '1mb4R9Robq18JSXMxZiboOitoIjtYL70O';

function machineId() {
  const host = os.hostname().replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 48) || 'windows';
  return `${host}-${randomBytes(6).toString('hex')}`;
}

export async function ensureBridgeConfiguration(root = defaultAgentRoot()) {
  const state = await loadAgentState(root);
  let changed = false;
  if (!state.bridge || typeof state.bridge !== 'object') {
    state.bridge = {};
    changed = true;
  }
  const defaults = {
    enabled: true,
    machineId: machineId(),
    pollIntervalSeconds: 60,
    ref: state.stableRef || 'main',
    drive: {
      enabled: false,
      remote: 'artisys-qa-drive',
      rootFolderId: DEFAULT_DRIVE_ROOT_FOLDER_ID,
    },
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (state.bridge[key] == null) {
      state.bridge[key] = value;
      changed = true;
    }
  }
  if (!state.bridge.drive || typeof state.bridge.drive !== 'object') {
    state.bridge.drive = { ...defaults.drive };
    changed = true;
  } else {
    for (const [key, value] of Object.entries(defaults.drive)) {
      if (state.bridge.drive[key] == null) {
        state.bridge.drive[key] = value;
        changed = true;
      }
    }
  }
  if (changed) await saveAgentState(state, root);
  return state;
}

export async function configureBridgeDrive({ enabled, remote, rootFolderId } = {}, root = defaultAgentRoot()) {
  const state = await ensureBridgeConfiguration(root);
  state.bridge.drive = {
    ...state.bridge.drive,
    ...(enabled == null ? {} : { enabled: Boolean(enabled) }),
    ...(remote ? { remote: String(remote) } : {}),
    ...(rootFolderId ? { rootFolderId: String(rootFolderId) } : {}),
  };
  await saveAgentState(state, root);
  return state.bridge.drive;
}

function commandForJob(project, job, outputDir) {
  const options = job.options || {};
  let command = job.action;
  const args = [];
  if (job.action === 'prints') command = 'run';
  if (job.action === 'video') command = 'demo';

  args.push(CLI_FILE, command, '--config', project.config, '--output', outputDir);

  if (['quick', 'full', 'release', 'prints'].includes(job.action)) {
    if (options.environment) args.push('--environment', options.environment);
    if (options.viewport) args.push('--viewport', options.viewport);
  }
  if (job.action === 'prints') {
    if (options.flow) args.push('--flow', options.flow);
    args.push('--visual');
  } else if (job.action === 'full' && options.visual) {
    args.push('--visual');
  } else if (job.action === 'video') {
    if (options.demo) args.push('--demo', options.demo);
    if (options.preset) args.push('--preset', options.preset);
    if (options.environment) args.push('--environment', options.environment);
  }
  return { command: process.execPath, args };
}

function runProcess(command, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve({ code, stdout, stderr });
      else {
        const error = new Error(`QA job failed with exit code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

export async function executeBridgeJob({ job, project, bridge, root = defaultAgentRoot() }) {
  const outputDir = path.join(root, 'artifacts', project.id, 'bridge', job.id);
  await fs.mkdir(outputDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const { command, args } = commandForJob(project, job, outputDir);
  try {
    const result = await runProcess(command, args, { cwd: path.dirname(project.config) });
    const upload = await uploadRunArtifacts({
      project,
      job,
      sourceDir: outputDir,
      drive: bridge.drive,
      manifest: {
        status: 'passed',
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: result.stdout.slice(-12000),
        stderr: result.stderr.slice(-12000),
      },
    }).catch(error => ({ uploaded: false, reason: 'upload-failed', error: error.message }));
    return {
      status: 'passed',
      outputDir,
      upload,
      stdout: result.stdout.slice(-12000),
      stderr: result.stderr.slice(-12000),
    };
  } catch (error) {
    const failureManifest = {
      schemaVersion: 1,
      jobId: job.id,
      projectId: project.id,
      action: job.action,
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message,
      stdout: String(error.stdout || '').slice(-12000),
      stderr: String(error.stderr || '').slice(-12000),
    };
    await fs.writeFile(path.join(outputDir, 'bridge-result.json'), `${JSON.stringify(failureManifest, null, 2)}\n`, 'utf8');
    const upload = await uploadRunArtifacts({ project, job, sourceDir: outputDir, drive: bridge.drive, manifest: failureManifest })
      .catch(uploadError => ({ uploaded: false, reason: 'upload-failed', error: uploadError.message }));
    return { status: 'failed', outputDir, upload, error: error.message };
  }
}

export async function bridgePollOnce({ root = defaultAgentRoot(), repoDir = REPO_DIR, logger = console } = {}) {
  const state = await ensureBridgeConfiguration(root);
  if (!state.bridge.enabled) return { enabled: false, processed: 0 };
  const processed = await loadProcessedJobs(root);
  const entries = await listPendingBridgeJobs({ repoDir, ref: state.bridge.ref || state.stableRef || 'main' });
  let count = 0;
  for (const entry of entries) {
    if (entry.error || processed[entry.job?.id]) continue;
    let job;
    try {
      job = validateBridgeJob(entry.job, {
        machineId: state.bridge.machineId,
        projects: state.projects,
      });
    } catch (error) {
      if (error.message === 'bridge job targets another machine' || error.message === 'bridge job expired') continue;
      logger.error(`[bridge] ${entry.file}: ${error.message}`);
      continue;
    }
    const project = state.projects.find(item => item.id === job.projectId);
    const result = await executeBridgeJob({ job, project, bridge: state.bridge, root });
    await markBridgeJobProcessed(job.id, {
      status: result.status,
      projectId: job.projectId,
      action: job.action,
      outputDir: result.outputDir,
      upload: result.upload,
      error: result.error || null,
    }, root);
    count += 1;
  }
  return { enabled: true, processed: count, discovered: entries.length };
}

export function startBridgePolling({ root = defaultAgentRoot(), logger = console } = {}) {
  let timer = null;
  let stopped = false;
  let busy = false;

  async function cycle() {
    if (stopped || busy) return;
    busy = true;
    try {
      const state = await ensureBridgeConfiguration(root);
      await bridgePollOnce({ root, logger });
      const seconds = Math.max(30, Number(state.bridge.pollIntervalSeconds || 60));
      if (!stopped) timer = setTimeout(cycle, seconds * 1000);
    } catch (error) {
      logger.error(`[bridge] ${error.stack || error.message || error}`);
      if (!stopped) timer = setTimeout(cycle, 60_000);
    } finally {
      busy = false;
    }
  }

  timer = setTimeout(cycle, 5000);
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    cycle,
  };
}
