import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDefaultAgentState, loadAgentState } from '../src/agent-state.js';
import { DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS, ensureBridgeConfiguration } from '../src/bridge-worker.js';

test('new agents check stable updates every minute', () => {
  assert.equal(createDefaultAgentState().updateIntervalMinutes, 1);
});

test('legacy hourly cadence migrates to one minute', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-fast-control-'));
  try {
    await fs.writeFile(path.join(root, 'agent-state.json'), JSON.stringify({
      ...createDefaultAgentState(),
      updateIntervalMinutes: 60,
    }));
    const state = await loadAgentState(root);
    assert.equal(state.updateIntervalMinutes, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('legacy bridge polling migrates to twenty seconds', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'artisys-fast-bridge-'));
  try {
    await fs.writeFile(path.join(root, 'agent-state.json'), JSON.stringify({
      ...createDefaultAgentState(),
      bridge: {
        enabled: true,
        machineId: 'test-machine-123456',
        pollIntervalSeconds: 60,
        ref: 'main',
        drive: { enabled: false, remote: 'artisys-qa-drive', rootFolderId: 'root' },
      },
    }));
    const state = await ensureBridgeConfiguration(root);
    assert.equal(state.bridge.pollIntervalSeconds, DEFAULT_BRIDGE_POLL_INTERVAL_SECONDS);
    assert.equal(state.bridge.pollIntervalSeconds, 20);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
