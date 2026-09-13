import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrowserLaunchSpec } from '../src/browser-launch.mjs';

test('Windows browser launch bypasses cmd so OAuth query params are preserved', () => {
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x&redirect_uri=http%3A%2F%2F127.0.0.1%3A53683%2F&response_type=code&scope=test';
  const spec = buildBrowserLaunchSpec({ platform: 'win32', url });

  assert.notEqual(spec.command.toLowerCase(), 'cmd');
  assert.notEqual(spec.command.toLowerCase(), 'cmd.exe');
  assert.ok(spec.args.includes(url));
});
