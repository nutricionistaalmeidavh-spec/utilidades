import fs from 'node:fs/promises';
import path from 'node:path';
import { runQaFlow } from './runner.js';
import { resolveDemoPreset } from './manifest.js';
import { normalizeDemoVideo } from './video.js';
import { writeJson } from './helpers.js';

export function buildDemoSummary({ qaSummary, demoName, preset, durationTargetSec, actualDurationSec, video }) {
  const timingDeviationSec = durationTargetSec == null ? null : Number((actualDurationSec - durationTargetSec).toFixed(3));
  return {
    schemaVersion: 1,
    runId: qaSummary.runId,
    systemId: qaSummary.systemId,
    demo: demoName,
    preset: preset.name,
    output: { width: preset.width, height: preset.height, video },
    durationTargetSec: durationTargetSec ?? null,
    actualDurationSec: Number(actualDurationSec.toFixed(3)),
    timingDeviationSec,
    status: qaSummary.status,
  };
}

export async function runDemoFlow({ manifest, rootDir, environmentName, environment, demoName, demoFile, presetName, durationTargetSec, captureViewport, outputRoot = 'qa-artifacts' }) {
  const preset = resolveDemoPreset(presetName);
  const viewport = captureViewport
    ? { name: preset.name, width: captureViewport.width, height: captureViewport.height }
    : manifest.mode === 'electron'
      ? { name: preset.name, width: manifest.demoCaptureViewport?.width || 1440, height: manifest.demoCaptureViewport?.height || 900 }
      : { name: preset.name, ...preset.captureViewport };

  const started = Date.now();
  const result = await runQaFlow({
    manifest,
    rootDir,
    environmentName,
    environment,
    flowName: `demo-${demoName}`,
    flowFile: demoFile,
    viewport,
    outputRoot,
  });
  const actualDurationSec = (Date.now() - started) / 1000;
  const sourceVideo = result.summary.video ? path.join(result.outputDir, result.summary.video) : null;
  let normalizedVideo = null;
  if (sourceVideo) {
    normalizedVideo = path.join(result.outputDir, 'demo-video.mp4');
    await normalizeDemoVideo(sourceVideo, normalizedVideo, preset);
  }
  const summary = buildDemoSummary({
    qaSummary: result.summary,
    demoName,
    preset,
    durationTargetSec,
    actualDurationSec,
    video: normalizedVideo ? path.basename(normalizedVideo) : null,
  });
  await writeJson(path.join(result.outputDir, 'demo-summary.json'), summary);
  if (normalizedVideo) await fs.access(normalizedVideo);
  return { outputDir: result.outputDir, summary, qaSummary: result.summary };
}
