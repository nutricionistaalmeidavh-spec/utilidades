import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultAgentRoot, loadAgentState, saveAgentState } from './agent-state.js';
import { listPendingBridgeJobs, loadProcessedJobs, markBridgeJobProcessed, validateBridgeJob } from './bridge-jobs.js';
import { uploadRunArtifacts } from './drive-uploader.js';
import { syncManagedProjects } from './project-bootstrap.js';
import { scanQaArtifacts } from './artifact-index.js';

const MODULE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = path.resolve(MODULE_DIR, '..', '..');
const CLI_FILE = path.join(MODULE_DIR, 'src', 'cli.mjs');
export const DEFAULT_DRIVE_ROOT_FOLDER_ID = '1mb4R9Robq18JSXMxZiboOitoIjtYL70O';
export const DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS = 20;

function machineId() {
  const host = os.hostname().replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 48) || 'windows';
  return `${host}-${randomBytes(6).toString('hex')}`;
}

async function emit(telemetry, event) {
  try { return await telemetry?.transition(event); } catch { return null; }
}

async function beat(telemetry, payload) {
  try { return await telemetry?.heartbeat(payload); } catch { return null; }
}

async function recordArtifact(telemetry, artifact) {
  try { return await telemetry?.recordArtifact(artifact); } catch { return null; }
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
    pollIntervalSeconds: DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS,
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
  if (!Number.isFinite(Number(state.bridge.pollIntervalSeconds)) || Number(state.bridge.pollIntervalSeconds) > DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS) {
    state.bridge.pollIntervalSeconds = DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS;
    changed = true;
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

function runProcess(command, args, { cwd, onActivity } = {}) {
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
    child.stdout.on('data', chunk => {
      stdout += String(chunk);
      try { onActivity?.(); } catch {}
    });
    child.stderr.on('data', chunk => {
      stderr += String(chunk);
      try { onActivity?.(); } catch {}
    });
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

function createArtifactWatcher({ root, outputDir, job, project, telemetry, intervalMs = 1000 } = {}) {
  const seen = new Set();
  const artifactRoot = path.join(root, 'artifacts');
  let timer = null;
  let busy = false;
  let stopped = false;

  async function scan() {
    if (busy) return;
    busy = true;
    try {
      const items = await scanQaArtifacts({ artifactRoot, runDir: outputDir });
      for (const item of items) {
        if (seen.has(item.localPath)) continue;
        seen.add(item.localPath);
        await recordArtifact(telemetry, { ...item, jobId: job.id, projectId: project.id });
      }
    } catch {
      // Artifact visibility is best-effort and must not change the QA result.
    } finally {
      busy = false;
    }
  }

  timer = setInterval(() => { void scan(); }, Math.max(500, Number(intervalMs) || 1000));
  return {
    scan,
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      if (!stopped || !busy) await scan();
      else {
        while (busy) await new Promise(resolve => setTimeout(resolve, 20));
        await scan();
      }
    },
  };
}

export async function executeBridgeJob({ job, project, bridge, root = defaultAgentRoot(), telemetry = null }) {
  const outputDir = path.join(root, 'artifacts', project.id, 'bridge', job.id);
  await fs.mkdir(outputDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const { command, args } = commandForJob(project, job, outputDir);
  await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'STARTING_QA', detail: `Iniciando ${job.action}` });
  const watcher = createArtifactWatcher({ root, outputDir, job, project, telemetry });
  await watcher.scan();
  let lastBeatAt = 0;
  const activity = () => {
    const now = Date.now();
    if (now - lastBeatAt < 1000) return;
    lastBeatAt = now;
    void beat(telemetry, { stage: 'RUNNING_QA', detail: 'Processo de QA ativo', projectId: project.id });
  };
  await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'RUNNING_QA', detail: `Executando ${job.action}` });

  try {
    const result = await runProcess(command, args, { cwd: path.dirname(project.config), onActivity: activity });
    await watcher.scan();
    await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'GENERATING_REPORT', detail: 'Consolidando evidências e relatório' });
    await watcher.scan();
    await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'UPLOADING_ARTIFACTS', detail: 'Enviando artefatos para o Drive' });
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
    await watcher.scan();
    if (upload?.uploaded) {
      await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'PASSED', detail: 'QA concluído e artefatos enviados' });
    } else {
      await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'PENDING_UPLOAD', detail: `QA aprovado; upload pendente${upload?.error ? `: ${upload.error}` : ''}` });
    }
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
    await watcher.scan();
    await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'UPLOADING_ARTIFACTS', detail: 'QA falhou; preservando e enviando evidências' });
    const upload = await uploadRunArtifacts({ project, job, sourceDir: outputDir, drive: bridge.drive, manifest: failureManifest })
      .catch(uploadError => ({ uploaded: false, reason: 'upload-failed', error: uploadError.message }));
    await watcher.scan();
    await emit(telemetry, { jobId: job.id, projectId: project.id, stage: 'FAILED', detail: `QA falhou: ${error.message}`, error: error.message });
    return { status: 'failed', outputDir, upload, error: error.message };
  } finally {
    await watcher.stop();
  }
}

async function retryPendingUploads({ state, processed, root, logger, telemetry = null }) {
  if (!state.bridge.drive.enabled) return 0;
  let retried = 0;
  for (const [jobId, record] of Object.entries(processed)) {
    if (record?.status !== 'pending-upload' || !record.outputDir || !record.projectId) continue;
    const project = state.projects.find(item => item.id === record.projectId && item.enabled !== false);
    if (!project) continue;
    const job = { id: jobId, projectId: record.projectId, action: record.action || 'full' };
    try {
      await emit(telemetry, { jobId, projectId: record.projectId, stage: 'UPLOADING_ARTIFACTS', detail: 'Repetindo upload de artefatos' });
      const upload = await uploadRunArtifacts({
        project,
        job,
        sourceDir: record.outputDir,
        drive: state.bridge.drive,
        manifest: {
          status: record.qaStatus || 'passed',
          retriedUploadAt: new Date().toISOString(),
          error: record.error || null,
        },
      });
      const finalStage = String(record.qaStatus || 'passed').toUpperCase() === 'FAILED' ? 'FAILED' : 'PASSED';
      await emit(telemetry, { jobId, projectId: record.projectId, stage: finalStage, detail: finalStage === 'PASSED' ? 'Upload pendente concluído' : 'Evidências de falha enviadas' });
      await markBridgeJobProcessed(jobId, {
        ...record,
        status: record.qaStatus || 'passed',
        upload,
      }, root);
      processed[jobId] = { ...record, status: record.qaStatus || 'passed', upload };
      retried += 1;
    } catch (error) {
      logger.error(`[bridge] upload retry ${jobId}: ${error.message}`);
    }
  }
  return retried;
}

export async function bridgePollOnce({ root = defaultAgentRoot(), repoDir = REPO_DIR, logger = console, telemetry = null } = {}) {
  let state = await ensureBridgeConfiguration(root);
  if (!state.bridge.enabled) return { enabled: false, processed: 0 };

  const projectSync = await syncManagedProjects({
    root,
    controlRepoDir: repoDir,
    ref: state.bridge.ref || state.stableRef || 'main',
    logger,
    telemetry,
  }).catch(error => ({ registryCount: 0, results: [], error: error.message }));
  state = await ensureBridgeConfiguration(root);

  if (!state.bridge.drive.enabled) {
    return { enabled: true, processed: 0, reason: 'waiting-for-drive', projectSync };
  }

  const processed = await loadProcessedJobs(root);
  const retriedUploads = await retryPendingUploads({ state, processed, root, logger, telemetry });
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
    await emit(telemetry, { jobId: job.id, projectId: job.projectId, stage: 'QUEUED', detail: `Job ${job.action} aceito pela bridge` });
    const result = await executeBridgeJob({ job, project, bridge: state.bridge, root, telemetry });
    const persistedStatus = result.upload?.uploaded ? result.status : 'pending-upload';
    await markBridgeJobProcessed(job.id, {
      status: persistedStatus,
      qaStatus: result.status,
      projectId: job.projectId,
      action: job.action,
      outputDir: result.outputDir,
      upload: result.upload,
      error: result.error || null,
    }, root);
    processed[job.id] = { status: persistedStatus };
    count += 1;
  }
  return { enabled: true, processed: count, discovered: entries.length, retriedUploads, projectSync };
}

export function startBridgePolling({ root = defaultAgentRoot(), logger = console, telemetry = null } = {}) {
  let timer = null;
  let stopped = false;
  let busy = false;

  async function cycle() {
    if (stopped || busy) return;
    busy = true;
    try {
      const state = await ensureBridgeConfiguration(root);
      await bridgePollOnce({ root, logger, telemetry });
      const seconds = Math.max(10, Number(state.bridge.pollIntervalSeconds || DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS));
      if (!stopped) timer = setTimeout(cycle, seconds * 1000);
    } catch (error) {
      logger.error(`[bridge] ${error.stack || error.message || error}`);
      if (!stopped) timer = setTimeout(cycle, DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS * 1000);
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
