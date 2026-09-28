import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { configureAgentCloud, loadAgentState } from '../src/agent-state.js';

test('cloud observability stays disabled by default and stores only endpoint state', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cloud-state-'));
  let state = await loadAgentState(root);
  assert.equal(state.cloud.enabled, false);
  assert.equal(state.cloud.endpoint, null);

  const cloud = await configureAgentCloud({ enabled: true, endpoint: 'https://qa.example.workers.dev/' }, { root });
  assert.equal(cloud.enabled, true);
  assert.equal(cloud.endpoint, 'https://qa.example.workers.dev');

  state = await loadAgentState(root);
  assert.equal(state.cloud.endpoint, 'https://qa.example.workers.dev');
  assert.equal('token' in state.cloud, false);
});

test('cloud endpoint rejects insecure non-loopback URLs', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-cloud-state-'));
  await assert.rejects(
    () => configureAgentCloud({ enabled: true, endpoint: 'http://example.com' }, { root }),
    /HTTPS/i,
  );
});
