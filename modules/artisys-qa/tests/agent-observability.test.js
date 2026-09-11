import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startAgentSupervisor } from '../src/agent-supervisor.js';
import { loadAgentState, saveAgentState } from '../src/agent-state.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function tempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'qa-agent-observability-'));
}

test('supervisor recovers telemetry, starts console, heartbeats and closes cleanly', async () => {
  const root = await tempRoot();
  const calls = { recover: 0, heartbeat: 0, consoleStart: 0, consoleClose: 0, bridgeTelemetry: null };
  const telemetry = {
    recoverInterruptedJob: async () => { calls.recover += 1; },
    heartbeat: async () => { calls.heartbeat += 1; },
    getSnapshot: async () => ({ currentJob: null }),
    transition: async () => {},
    readJob: async () => null,
    readEvents: async () => [],
    listHistory: async () => [],
  };
  const consoleInstance = {
    start: async () => { calls.consoleStart += 1; return { baseURL: 'http://127.0.0.1:4160' }; },
    close: async () => { calls.consoleClose += 1; },
  };
  const bridgeControl = { stop() {} };
  const supervisor = await startAgentSupervisor({
    root,
    checkUpdate: async () => ({ updated: false }),
    initialUpdateDelayMs: 60_000,
    reconcileIntervalMs: 60_000,
    heartbeatIntervalMs: 10,
    telemetryFactory: () => telemetry,
    consoleFactory: () => consoleInstance,
    bridgeStarter: options => { calls.bridgeTelemetry = options.telemetry; return bridgeControl; },
  });
  await wait(35);
  assert.equal(calls.recover, 1);
  assert.equal(calls.consoleStart, 1);
  assert.equal(calls.bridgeTelemetry, telemetry);
  assert.ok(calls.heartbeat >= 2);
  await supervisor.stop();
  assert.equal(calls.consoleClose, 1);
});

test('stale active job is marked stalled without crashing supervisor', async () => {
  const root = await tempRoot();
  const transitions = [];
  let current = {
    jobId: 'job-stale',
    projectId: 'pdv-artisys',
    stage: 'RUNNING_QA',
    updatedAt: new Date(Date.now() - 60_000).toISOString(),
  };
  const telemetry = {
    recoverInterruptedJob: async () => {},
    heartbeat: async () => {},
    getSnapshot: async () => ({ currentJob: current }),
    transition: async event => { transitions.push(event); current = null; },
    readJob: async () => null,
    readEvents: async () => [],
    listHistory: async () => [],
  };
  const supervisor = await startAgentSupervisor({
    root,
    checkUpdate: async () => ({ updated: false }),
    initialUpdateDelayMs: 60_000,
    reconcileIntervalMs: 60_000,
    heartbeatIntervalMs: 10,
    stallThresholdMs: 100,
    telemetryFactory: () => telemetry,
    consoleFactory: () => ({ start: async () => ({}), close: async () => {} }),
    bridgeStarter: () => ({ stop() {} }),
  });
  await wait(30);
  assert.equal(transitions[0]?.stage, 'STALLED');
  assert.equal(transitions[0]?.jobId, 'job-stale');
  await supervisor.stop();
});

test('enabled cloud mirror is injected into telemetry without persisting its token', async () => {
  const root = await tempRoot();
  const state = await loadAgentState(root);
  state.cloud = {
    enabled: true,
    endpoint: 'https://artisys-qa.example.workers.dev',
    tokenEnv: 'QA_TEST_TOKEN',
    uploadArtifacts: true,
    timeoutMs: 5000,
  };
  await saveAgentState(state, root);
  const old = process.env.QA_TEST_TOKEN;
  process.env.QA_TEST_TOKEN = 'runtime-only-secret';
  let mirrorOptions = null;
  let publishHook = null;
  const mirror = { publish: async () => {}, health: async () => ({ ok: true }) };
  const telemetry = {
    recoverInterruptedJob: async () => {},
    heartbeat: async () => {},
    getSnapshot: async () => ({ currentJob: null }),
    transition: async () => {},
    readJob: async () => null,
    readEvents: async () => [],
    listHistory: async () => [],
  };
  const supervisor = await startAgentSupervisor({
    root,
    checkUpdate: async () => ({ updated: false }),
    initialUpdateDelayMs: 60_000,
    reconcileIntervalMs: 60_000,
    heartbeatIntervalMs: 60_000,
    cloudFactory: options => { mirrorOptions = options; return mirror; },
    telemetryFactory: options => { publishHook = options.onPublish; return telemetry; },
    consoleFactory: () => ({ start: async () => ({}), close: async () => {} }),
    bridgeStarter: () => ({ stop() {} }),
  });
  assert.equal(mirrorOptions.endpoint, 'https://artisys-qa.example.workers.dev');
  assert.equal(mirrorOptions.token, 'runtime-only-secret');
  assert.equal(typeof publishHook, 'function');
  await publishHook({ type: 'heartbeat', payload: { machineId: 'victor-pc' } });
  const raw = await fs.readFile(path.join(root, 'agent-state.json'), 'utf8');
  assert.equal(raw.includes('runtime-only-secret'), false);
  await supervisor.stop();
  if (old == null) delete process.env.QA_TEST_TOKEN; else process.env.QA_TEST_TOKEN = old;
});
