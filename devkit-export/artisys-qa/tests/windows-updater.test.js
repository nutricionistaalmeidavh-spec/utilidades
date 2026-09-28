import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWindowsCommand } from '../src/agent-updater.js';

test('Windows updater executes npm.cmd through cmd.exe instead of spawning the shim directly', () => {
  const normalized = normalizeWindowsCommand(
    'npm.cmd',
    ['run', 'check'],
    'win32',
    { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
  );
  assert.equal(normalized.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(normalized.args.slice(0, 3), ['/d', '/s', '/c']);
  assert.match(normalized.args[3], /^npm\.cmd run check$/);
});

test('non-Windows updater keeps executable and args unchanged', () => {
  const normalized = normalizeWindowsCommand('npm', ['test'], 'linux', {});
  assert.equal(normalized.command, 'npm');
  assert.deepEqual(normalized.args, ['test']);
});
