import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startAgentSupervisor } from '../src/agent-supervisor.js';

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
  try {
    await wait(35);
    assert.equal(calls.recover, 1);
    assert.equal(calls.consoleStart, 1);
    assert.equal(supervisor.localTelemetry, telemetry);
    assert.equal(calls.bridgeTelemetry, supervisor.telemetry);
    assert.ok(calls.heartbeat >= 2);
  } finally {
    await supervisor.stop();
  }
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
  try {
    await wait(30);
    assert.equal(transitions[0]?.stage, 'STALLED');
    assert.equal(transitions[0]?.jobId, 'job-stale');
  } finally {
    await supervisor.stop();
  }
});
