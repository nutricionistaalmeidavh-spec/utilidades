import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ensureAgentConsoleConfiguration, setAgentConsoleLan } from '../src/agent-state.js';

test('console config is generated once and persisted', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-state-'));
  const first = await ensureAgentConsoleConfiguration(root);
  const second = await ensureAgentConsoleConfiguration(root);
  assert.equal(first.console.token, second.console.token);
  assert.equal(first.console.port, 4160);
  assert.equal(first.console.host, '127.0.0.1');
  assert.equal(first.console.lanEnabled, false);
  assert.match(first.console.token, /^[a-f0-9]{48}$/);
});

test('LAN toggle changes binding but preserves console token', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-state-'));
  const initial = await ensureAgentConsoleConfiguration(root);
  const enabled = await setAgentConsoleLan(true, { root });
  assert.equal(enabled.lanEnabled, true);
  assert.equal(enabled.host, '0.0.0.0');
  assert.equal(enabled.token, initial.console.token);
  const disabled = await setAgentConsoleLan(false, { root });
  assert.equal(disabled.lanEnabled, false);
  assert.equal(disabled.host, '127.0.0.1');
  assert.equal(disabled.token, initial.console.token);
});
