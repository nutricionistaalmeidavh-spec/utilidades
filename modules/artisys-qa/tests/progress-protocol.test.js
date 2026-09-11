import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_PROGRESS_PREFIX, formatQaProgressEvent, createQaProgressParser } from '../src/progress-protocol.js';

test('formats progress event as one machine-readable line', () => {
  const line = formatQaProgressEvent({ type: 'flow-start', flow: 'smoke', current: 1, total: 2 });
  assert.ok(line.startsWith(QA_PROGRESS_PREFIX));
  assert.equal(JSON.parse(line.slice(QA_PROGRESS_PREFIX.length)).flow, 'smoke');
  assert.equal(line.includes('\n'), false);
});

test('parser handles partial chunks and ignores normal output', () => {
  const events = [];
  const parser = createQaProgressParser(event => events.push(event));
  parser.push('normal log\nARTISYS_QA_EVE');
  parser.push('NT={"type":"step-start","step":"open","current":1,"total":3}\nmore log\n');
  parser.flush();
  assert.deepEqual(events, [{ type: 'step-start', step: 'open', current: 1, total: 3 }]);
});

test('parser ignores malformed progress JSON', () => {
  const events = [];
  const parser = createQaProgressParser(event => events.push(event));
  parser.push(`${QA_PROGRESS_PREFIX}{bad}\n`);
  parser.flush();
  assert.deepEqual(events, []);
});
