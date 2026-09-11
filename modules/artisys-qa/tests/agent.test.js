import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createDefaultAgentState,
  loadAgentState,
  saveAgentState,
  registerAgentProject,
  unregisterAgentProject,
  setAgentAutoUpdate,
} from '../src/agent-state.js';
import {
  compareVersions,
  inactiveSlotName,
  checkForStableUpdate,
  rollbackAgentSlot,
} from '../src/agent-updater.js';
import { buildProjectRemoteCommand } from '../src/agent-supervisor.js';

async function tempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'artisys-qa-agent-'));
}

test('agent state registers projects and preserves generated token', async () => {
  const root = await tempRoot();
  try {
    const config = path.join(root, 'consumer', 'qa', 'artisys-qa.config.json');
    await fs.mkdir(path.dirname(config), { recursive: true });
    await fs.writeFile(config, '{}');
    const project = await registerAgentProject({ config, name: 'PDV Nexus', port: 4173 }, { root });
    assert.equal(project.id, 'pdv-nexus');
    assert.match(project.token, /^[a-f0-9]{48}$/);
    const updated = await registerAgentProject({ config, name: 'PDV Nexus', port: 4174 }, { root });
    assert.equal(updated.token, project.token);
    const state = await loadAgentState(root);
    assert.equal(state.projects.length, 1);
    assert.equal(state.projects[0].port, 4174);
    assert.equal(state.projects[0].token, project.token);
    await setAgentAutoUpdate(false, { root });
    assert.equal((await loadAgentState(root)).autoUpdate, false);
    await unregisterAgentProject('pdv-nexus', { root });
    assert.equal((await loadAgentState(root)).projects.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('agent state tolerates UTF-8 BOM from older PowerShell installs', async () => {
  const root = await tempRoot();
  try {
    await fs.writeFile(path.join(root, 'agent-state.json'), `\uFEFF${JSON.stringify(createDefaultAgentState())}`, 'utf8');
    const state = await loadAgentState(root);
    assert.equal(state.activeSlot, 'slot-a');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('agent refuses two enabled projects on the same port', async () => {
  const root = await tempRoot();
  try {
    const a = path.join(root, 'a.json');
    const b = path.join(root, 'b.json');
    await fs.writeFile(a, '{}');
    await fs.writeFile(b, '{}');
    await registerAgentProject({ config: a, name: 'A', port: 4173 }, { root });
    await assert.rejects(registerAgentProject({ config: b, name: 'B', port: 4173 }, { root }), /already used/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('remote command delegates to existing token-authenticated Remote Control', () => {
  const project = { id: 'pdv', config: path.resolve('qa.json'), host: '0.0.0.0', port: 4180, token: 'secret' };
  const command = buildProjectRemoteCommand(project, { node: 'node-test', cliFile: path.resolve('cli.mjs'), root: path.resolve('agent-root') });
  assert.equal(command.command, 'node-test');
  assert.ok(command.args.includes('remote'));
  assert.ok(command.args.includes('--token'));
  assert.ok(command.args.includes('secret'));
  assert.ok(command.args.includes('4180'));
});

test('stable version comparison and slot selection are deterministic', () => {
  assert.equal(compareVersions('2.1.0', '2.0.9'), 1);
  assert.equal(compareVersions('2.1.0', '2.1.0'), 0);
  assert.equal(compareVersions('2.0.9', '2.1.0'), -1);
  assert.equal(inactiveSlotName('slot-a'), 'slot-b');
  assert.equal(inactiveSlotName('slot-b'), 'slot-a');
});

test('stable updater validates inactive slot before switching active pointer', async () => {
  const root = await tempRoot();
  try {
    const active = path.join(root, 'slots', 'slot-a', 'modules', 'artisys-qa');
    await fs.mkdir(active, { recursive: true });
    await fs.writeFile(path.join(active, 'package.json'), JSON.stringify({ version: '2.0.0' }));
    const state = createDefaultAgentState();
    state.repository = 'git@example.invalid:artisys/utilidades.git';
    await saveAgentState(state, root);

    const sha = 'a'.repeat(40);
    const calls = [];
    const run = async (command, args) => {
      calls.push([command, ...args]);
      if (args.includes('show')) return { stdout: JSON.stringify({ channel: 'stable', version: '2.1.0' }), stderr: '' };
      if (args.includes('rev-parse')) return { stdout: `${sha}\n`, stderr: '' };
      if (args[0] === 'clone') {
        const slot = args.at(-1);
        const moduleDir = path.join(slot, 'modules', 'artisys-qa');
        await fs.mkdir(moduleDir, { recursive: true });
        await fs.writeFile(path.join(moduleDir, 'package.json'), JSON.stringify({ version: '2.1.0' }));
      }
      return { stdout: '', stderr: '' };
    };

    const result = await checkForStableUpdate({ root, run, now: () => '2026-09-11T18:00:00.000Z' });
    assert.equal(result.updated, true);
    const after = await loadAgentState(root);
    assert.equal(after.activeSlot, 'slot-b');
    assert.equal(after.previousSlot, 'slot-a');
    assert.equal(after.lastUpdateResult.status, 'activated');
    assert.ok(calls.some(call => call.includes('test')));
    assert.ok(calls.some(call => call.includes('check')));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('stable updater rejects a candidate whose package version does not match the channel', async () => {
  const root = await tempRoot();
  try {
    const active = path.join(root, 'slots', 'slot-a', 'modules', 'artisys-qa');
    await fs.mkdir(active, { recursive: true });
    await fs.writeFile(path.join(active, 'package.json'), JSON.stringify({ version: '2.0.0' }));
    await saveAgentState(createDefaultAgentState(), root);
    const run = async (_command, args) => {
      if (args.includes('show')) return { stdout: JSON.stringify({ channel: 'stable', version: '2.1.0' }), stderr: '' };
      if (args.includes('rev-parse')) return { stdout: `${'c'.repeat(40)}\n`, stderr: '' };
      if (args[0] === 'clone') {
        const slot = args.at(-1);
        const moduleDir = path.join(slot, 'modules', 'artisys-qa');
        await fs.mkdir(moduleDir, { recursive: true });
        await fs.writeFile(path.join(moduleDir, 'package.json'), JSON.stringify({ version: '9.9.9' }));
      }
      return { stdout: '', stderr: '' };
    };
    const result = await checkForStableUpdate({ root, run });
    assert.equal(result.updated, false);
    assert.equal(result.reason, 'failed');
    assert.match(result.error.message, /does not match candidate package version/);
    assert.equal((await loadAgentState(root)).activeSlot, 'slot-a');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('failed update leaves current slot active and records failure', async () => {
  const root = await tempRoot();
  try {
    const active = path.join(root, 'slots', 'slot-a', 'modules', 'artisys-qa');
    await fs.mkdir(active, { recursive: true });
    await fs.writeFile(path.join(active, 'package.json'), JSON.stringify({ version: '2.0.0' }));
    await saveAgentState(createDefaultAgentState(), root);
    const run = async (_command, args) => {
      if (args.includes('show')) return { stdout: JSON.stringify({ channel: 'stable', version: '2.1.0' }), stderr: '' };
      if (args.includes('rev-parse')) return { stdout: `${'b'.repeat(40)}\n`, stderr: '' };
      if (args[0] === 'clone') throw new Error('network unavailable');
      return { stdout: '', stderr: '' };
    };
    const result = await checkForStableUpdate({ root, run });
    assert.equal(result.updated, false);
    assert.equal(result.reason, 'failed');
    const after = await loadAgentState(root);
    assert.equal(after.activeSlot, 'slot-a');
    assert.equal(after.lastUpdateResult.status, 'failed');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('rollback swaps to previous slot after failed activation', async () => {
  const root = await tempRoot();
  try {
    const state = createDefaultAgentState();
    state.activeSlot = 'slot-b';
    state.previousSlot = 'slot-a';
    state.lastUpdateResult = { status: 'activated' };
    await saveAgentState(state, root);
    assert.equal(await rollbackAgentSlot({ root, reason: 'health failed' }), true);
    const after = await loadAgentState(root);
    assert.equal(after.activeSlot, 'slot-a');
    assert.equal(after.previousSlot, 'slot-b');
    assert.equal(after.lastUpdateResult.status, 'rolled-back');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
