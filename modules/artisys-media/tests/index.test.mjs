import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMediaJob, mediaDuration, createMotionCanvasManifest, executeMediaBunnyConversion } from '../src/index.mjs';

test('normalizes a portable media job and validates trim range', () => {
  assert.deepEqual(normalizeMediaJob({ input: 'in.mp4', output: { format: 'webm' }, trim: { start: 2, end: 5 }, resize: { width: 720, height: 1280 } }), {
    input: 'in.mp4', output: { format: 'webm' }, trim: { start: 2, end: 5 }, resize: { width: 720, height: 1280, fit: 'contain' }, audio: { mute: false, volume: 1 }
  });
  assert.throws(() => normalizeMediaJob({ input: 'x', output: { format: 'mp4' }, trim: { start: 5, end: 2 } }), /trim/);
});

test('computes duration and creates a Motion Canvas render manifest', () => {
  const job = normalizeMediaJob({ input: 'in.mp4', output: { format: 'webm' }, trim: { start: 2, end: 5 }, resize: { width: 720, height: 1280 } });
  assert.equal(mediaDuration(job), 3);
  assert.deepEqual(createMotionCanvasManifest(job, ['intro', 'body']), { width: 720, height: 1280, durationSeconds: 3, scenes: ['intro', 'body'] });
});

test('executes MediaBunny Conversion.init/execute boundary', async () => {
  let received;
  const runtime = { Conversion: { init: async (options) => ({ isValid: true, execute: async () => { received = options; return 'ok'; } }) } };
  assert.equal(await executeMediaBunnyConversion(runtime, { input: 'I', output: 'O', trim: { start: 1, end: 2 } }), 'ok');
  assert.deepEqual(received, { input: 'I', output: 'O', trim: { start: 1, end: 2 } });
});
