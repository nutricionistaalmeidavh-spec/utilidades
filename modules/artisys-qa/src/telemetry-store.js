import fs from 'node:fs/promises';
import path from 'node:path';

export const ACTIVE_JOB_STAGES = new Set([
  'QUEUED','SYNCING_PROJECT','INSTALLING_DEPENDENCIES','REGISTERING_PROJECT',
  'STARTING_QA','RUNNING_QA','CAPTURING_ARTIFACTS','GENERATING_REPORT','UPLOADING_ARTIFACTS'
]);

export const TERMINAL_JOB_STAGES = new Set([
  'PASSED','FAILED','EXPIRED','CANCELLED','STALLED','PENDING_UPLOAD','INTERRUPTED'
]);

export const JOB_STAGES = new Set(['IDLE', ...ACTIVE_JOB_STAGES, ...TERMINAL_JOB_STAGES]);

const TRANSITIONS = new Map([
  ['IDLE', new Set(['QUEUED'])],
  ['QUEUED', new Set(['SYNCING_PROJECT','STARTING_QA','EXPIRED','CANCELLED','FAILED'])],
  ['SYNCING_PROJECT', new Set(['INSTALLING_DEPENDENCIES','REGISTERING_PROJECT','FAILED','CANCELLED'])],
  ['INSTALLING_DEPENDENCIES', new Set(['REGISTERING_PROJECT','FAILED','CANCELLED'])],
  ['REGISTERING_PROJECT', new Set(['STARTING_QA','FAILED','CANCELLED'])],
  ['STARTING_QA', new Set(['RUNNING_QA','FAILED','CANCELLED'])],
  ['RUNNING_QA', new Set(['RUNNING_QA','CAPTURING_ARTIFACTS','GENERATING_REPORT','UPLOADING_ARTIFACTS','PASSED','FAILED','CANCELLED','STALLED'])],
  ['CAPTURING_ARTIFACTS', new Set(['CAPTURING_ARTIFACTS','RUNNING_QA','GENERATING_REPORT','UPLOADING_ARTIFACTS','FAILED','STALLED'])],
  ['GENERATING_REPORT', new Set(['UPLOADING_ARTIFACTS','PASSED','FAILED','STALLED'])],
  ['UPLOADING_ARTIFACTS', new Set(['PASSED','FAILED','PENDING_UPLOAD','STALLED'])],
  ['PENDING_UPLOAD', new Set(['UPLOADING_ARTIFACTS','PASSED','FAILED'])],
  ['STALLED', new Set(['RUNNING_QA','FAILED','INTERRUPTED'])],
]);

function iso(now) {
  const value = typeof now === 'function' ? now() : new Date();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function safeId(value, label) {
  const text = String(value || '');
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(text)) throw new Error(`${label} is invalid`);
  return text;
}

function safeProgress(value) {
  if (value == null) return null;
  const current = Number(value.current);
  const total = Number(value.total);
  if (!Number.isFinite(current) || !Number.isFinite(total) || current < 0 || total < 0 || current > total) throw new Error('progress is invalid');
  return { current, total };
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
}

function inside(root, candidate) {
  const base = path.resolve(root);
  const resolved = path.resolve(candidate);
  return resolved === base || resolved.startsWith(`${base}${path.sep}`);
}

export function createTelemetryStore({ root, machineId, redact = value => value, now = () => new Date(), maxEvents = 500, onPublish = null } = {}) {
  if (!root) throw new Error('telemetry root is required');
  if (!machineId) throw new Error('machineId is required');
  const telemetryRoot = path.join(root, 'telemetry');
  const currentFile = path.join(telemetryRoot, 'current.json');
  const eventsFile = path.join(telemetryRoot, 'events.ndjson');
  const jobsRoot = path.join(telemetryRoot, 'jobs');
  const artifactRoot = path.join(root, 'artifacts');
  let mutationQueue = Promise.resolve();

  const baseSnapshot = () => ({
    schemaVersion: 1,
    machineId,
    updatedAt: iso(now),
    heartbeatAt: null,
    currentJob: null,
    lastJob: null,
    artifacts: [],
    agent: { stage: 'IDLE', detail: null, projectId: null, updatedAt: iso(now) },
  });

  function serialize(operation) {
    const run = mutationQueue.then(operation, operation);
    mutationQueue = run.catch(() => {});
    return run;
  }

  function publish(message) {
    if (typeof onPublish !== 'function') return;
    queueMicrotask(() => { void Promise.resolve(onPublish(redact(message))).catch(() => {}); });
  }

  async function getSnapshot() {
    await mutationQueue.catch(() => {});
    return readJson(currentFile, baseSnapshot());
  }

  async function writeSnapshot(snapshot) {
    const clean = redact({ ...snapshot, updatedAt: iso(now) });
    await atomicJson(currentFile, clean);
    return clean;
  }

  async function readAllEvents() {
    try {
      const raw = await fs.readFile(eventsFile, 'utf8');
      return raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async function appendEvent(event) {
    const clean = redact(event);
    const events = await readAllEvents();
    events.push(clean);
    const kept = events.slice(-Math.max(1, Number(maxEvents) || 1));
    await fs.mkdir(telemetryRoot, { recursive: true });
    const temporary = `${eventsFile}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
    await fs.writeFile(temporary, kept.map(item => JSON.stringify(item)).join('\n') + (kept.length ? '\n' : ''), 'utf8');
    await fs.rename(temporary, eventsFile);
    return clean;
  }

  function jobFile(jobId) {
    return path.join(jobsRoot, `${safeId(jobId, 'jobId')}.json`);
  }

  async function persistJob(job, artifacts = null) {
    if (!job?.jobId) return null;
    const existing = await readJson(jobFile(job.jobId), {});
    const merged = redact({ ...existing, ...job, artifacts: artifacts ?? existing.artifacts ?? [] });
    await atomicJson(jobFile(job.jobId), merged);
    return merged;
  }

  function transition(input = {}) {
    return serialize(async () => {
      const jobId = safeId(input.jobId, 'jobId');
      const projectId = safeId(input.projectId, 'projectId');
      const stage = String(input.stage || '');
      if (!JOB_STAGES.has(stage) || stage === 'IDLE') throw new Error(`Unknown telemetry stage: ${stage}`);
      const snapshot = await readJson(currentFile, baseSnapshot());
      const previous = snapshot.currentJob?.jobId === jobId
        ? snapshot.currentJob
        : (snapshot.lastJob?.jobId === jobId && ['PENDING_UPLOAD','STALLED'].includes(snapshot.lastJob.stage) ? snapshot.lastJob : null);
      const previousStage = previous?.stage || 'IDLE';
      const allowed = TRANSITIONS.get(previousStage);
      if (!allowed?.has(stage)) throw new Error(`Invalid telemetry transition: ${previousStage} -> ${stage}`);
      const at = iso(now);
      const next = {
        jobId,
        projectId,
        stage,
        detail: input.detail == null ? previous?.detail || null : String(input.detail),
        progress: input.progress == null ? previous?.progress || null : safeProgress(input.progress),
        flow: input.flow == null ? previous?.flow || null : String(input.flow),
        test: input.test == null ? previous?.test || null : String(input.test),
        error: input.error == null ? null : String(input.error),
        startedAt: previous?.startedAt || at,
        updatedAt: at,
        finishedAt: TERMINAL_JOB_STAGES.has(stage) ? at : null,
      };
      const event = { schemaVersion: 1, machineId, at, ...next };
      await appendEvent(event);
      const terminal = TERMINAL_JOB_STAGES.has(stage);
      const relatedArtifacts = (snapshot.artifacts || []).filter(item => item.jobId === jobId);
      const nextSnapshot = {
        ...snapshot,
        currentJob: terminal ? null : next,
        lastJob: terminal ? next : snapshot.lastJob,
        artifacts: snapshot.currentJob?.jobId === jobId || snapshot.lastJob?.jobId === jobId ? snapshot.artifacts || [] : [],
      };
      await persistJob(next, relatedArtifacts);
      await writeSnapshot(nextSnapshot);
      publish({ type: 'event', payload: event });
      publish({ type: 'job', payload: { ...next, machineId } });
      return redact(next);
    });
  }

  function heartbeat(detail = null) {
    return serialize(async () => {
      const snapshot = await readJson(currentFile, baseSnapshot());
      const at = iso(now);
      const payload = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : { detail };
      if (snapshot.currentJob && payload.detail) snapshot.currentJob = { ...snapshot.currentJob, detail: String(payload.detail), updatedAt: at };
      snapshot.agent = {
        stage: payload.stage ? String(payload.stage) : snapshot.agent?.stage || 'IDLE',
        detail: payload.detail == null ? snapshot.agent?.detail || null : String(payload.detail),
        projectId: payload.projectId == null ? snapshot.agent?.projectId || null : String(payload.projectId),
        updatedAt: at,
      };
      snapshot.heartbeatAt = at;
      const clean = await writeSnapshot(snapshot);
      publish({ type: 'heartbeat', payload: {
        machineId,
        status: 'online',
        at,
        stage: clean.agent?.stage || null,
        detail: clean.agent?.detail || null,
        projectId: clean.agent?.projectId || clean.currentJob?.projectId || null,
        currentJob: clean.currentJob || null,
        agent: clean.agent || null,
      } });
      return clean;
    });
  }

  function recordArtifact(input = {}) {
    return serialize(async () => {
      const jobId = safeId(input.jobId, 'jobId');
      const localPath = path.resolve(String(input.localPath || ''));
      if (!inside(artifactRoot, localPath)) throw new Error('artifact path is outside the QA artifact root');
      const record = redact({
        jobId,
        projectId: input.projectId ? safeId(input.projectId, 'projectId') : null,
        type: String(input.type || 'file'),
        name: String(input.name || path.basename(localPath)),
        relativePath: input.relativePath == null ? null : String(input.relativePath).replace(/\\/g, '/'),
        localPath,
        createdAt: input.createdAt || iso(now),
        size: Number.isFinite(Number(input.size)) ? Number(input.size) : null,
        uploaded: input.uploaded === true,
        provider: input.provider || null,
        remoteKey: input.remoteKey || null,
      });
      const snapshot = await readJson(currentFile, baseSnapshot());
      const existing = Array.isArray(snapshot.artifacts) ? snapshot.artifacts : [];
      snapshot.artifacts = [...existing.filter(item => !(item.jobId === jobId && item.localPath === localPath)), record].slice(-200);
      const event = { schemaVersion: 1, machineId, at: iso(now), jobId, projectId: record.projectId, stage: 'CAPTURING_ARTIFACTS', detail: `Artifact ${record.name}`, artifact: record };
      await appendEvent(event);
      const job = await readJson(jobFile(jobId), { jobId, projectId: record.projectId, stage: snapshot.currentJob?.stage || snapshot.lastJob?.stage || 'CAPTURING_ARTIFACTS' });
      const jobArtifacts = [...(job.artifacts || []).filter(item => item.localPath !== localPath), record].slice(-200);
      await persistJob(job, jobArtifacts);
      await writeSnapshot(snapshot);
      publish({ type: 'event', payload: event });
      publish({ type: 'artifact', payload: record });
      return record;
    });
  }

  async function readEvents({ jobId = null, limit = 100 } = {}) {
    await mutationQueue.catch(() => {});
    const events = await readAllEvents();
    const filtered = jobId ? events.filter(item => item.jobId === jobId) : events;
    return filtered.slice(-Math.max(1, Math.min(1000, Number(limit) || 100)));
  }

  async function readJob(jobId) {
    await mutationQueue.catch(() => {});
    return readJson(jobFile(jobId), null);
  }

  async function listHistory(limit = 20) {
    await mutationQueue.catch(() => {});
    try {
      const entries = await fs.readdir(jobsRoot, { withFileTypes: true });
      const jobs = [];
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
        const job = await readJson(path.join(jobsRoot, entry.name), null);
        if (job) jobs.push(job);
      }
      return jobs.sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)).slice(0, Math.max(1, Number(limit) || 20));
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  function recoverInterruptedJob() {
    return serialize(async () => {
      const snapshot = await readJson(currentFile, baseSnapshot());
      if (!snapshot.currentJob || !ACTIVE_JOB_STAGES.has(snapshot.currentJob.stage)) return null;
      const previous = snapshot.currentJob;
      const at = iso(now);
      const recovered = { ...previous, stage: 'INTERRUPTED', detail: 'Agent restarted while job was active', updatedAt: at, finishedAt: at };
      const event = { schemaVersion: 1, machineId, at, ...recovered };
      await appendEvent(event);
      await persistJob(recovered, (snapshot.artifacts || []).filter(item => item.jobId === recovered.jobId));
      await writeSnapshot({ ...snapshot, currentJob: null, lastJob: recovered });
      publish({ type: 'event', payload: event });
      publish({ type: 'job', payload: { ...recovered, machineId } });
      return recovered;
    });
  }

  return { root: telemetryRoot, getSnapshot, transition, heartbeat, recordArtifact, readEvents, readJob, listHistory, recoverInterruptedJob };
}
