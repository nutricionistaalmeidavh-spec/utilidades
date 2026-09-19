import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonText } from '../src/index.mjs';

test('reporter parses Windows PowerShell UTF-8 BOM JSON reports', () => {
  const value = parseJsonText('\uFEFF{"status":"fail","steps":[{"id":"qa","exitCode":1}]}');
  assert.equal(value.status, 'fail');
  assert.equal(value.steps[0].exitCode, 1);
});
