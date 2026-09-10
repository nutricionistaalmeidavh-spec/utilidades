import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PRESETS } from '../src/config.js';
import { buildNormalizeArgs } from '../src/video.js';
import { buildDemoSummary } from '../src/demo.js';

test('social presets expose exact output dimensions', () => {
  assert.deepEqual(DEMO_PRESETS['landscape-16x9'], { name: 'landscape-16x9', width: 1920, height: 1080, captureViewport: { width: 1920, height: 1080 } });
  assert.deepEqual(DEMO_PRESETS['square-1x1'], { name: 'square-1x1', width: 1080, height: 1080, captureViewport: { width: 1080, height: 1080 } });
  assert.deepEqual(DEMO_PRESETS['reels-9x16'], { name: 'reels-9x16', width: 1080, height: 1920, captureViewport: { width: 1080, height: 1920 } });
});

test('ffmpeg normalization preserves aspect ratio and pads to reels canvas', () => {
  const args = buildNormalizeArgs('in.webm', 'out.mp4', DEMO_PRESETS['reels-9x16']);
  const filter = args[args.indexOf('-vf') + 1];
  assert.match(filter, /scale=1080:1920:force_original_aspect_ratio=decrease/);
  assert.match(filter, /pad=1080:1920/);
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('yuv420p'));
  assert.ok(args.includes('30'));
});

test('ffmpeg normalization stretches captured media to requested demo duration', () => {
  const args = buildNormalizeArgs('in.mp4', 'out.mp4', DEMO_PRESETS['reels-9x16'], {
    sourceDurationSec: 12,
    durationTargetSec: 30,
  });
  const filter = args[args.indexOf('-vf') + 1];
  assert.match(filter, /^setpts=2\.5\*PTS,/);
});

test('demo timing deviation is informative and never changes pass status', () => {
  const summary = buildDemoSummary({
    qaSummary: { runId: 'r1', systemId: 'sample', status: 'passed', demoProfile: { profile: 'default', strategy: 'persistent' } },
    demoName: 'quick-30s',
    preset: DEMO_PRESETS['reels-9x16'],
    durationTargetSec: 30,
    actualDurationSec: 31.25,
    videoDurationSec: 30.01,
    video: 'demo-video.mp4',
  });
  assert.equal(summary.status, 'passed');
  assert.equal(summary.timingDeviationSec, 1.25);
  assert.equal(summary.videoDurationSec, 30.01);
  assert.equal(summary.output.width, 1080);
  assert.equal(summary.output.height, 1920);
  assert.deepEqual(summary.demoProfile, { profile: 'default', strategy: 'persistent' });
});
