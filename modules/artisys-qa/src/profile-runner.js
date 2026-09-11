import path from 'node:path';
import { resolveEnvironment, resolveFlow, resolveViewport } from './manifest.js';
import { runQaFlow } from './runner.js';
import { resolveQaProfile } from './profiles.js';
import { runDesktopSmoke } from './desktop.js';
import { aggregateQaReport, writeQaReport } from './reporting.js';
import { evaluateReleaseGate } from './release-gate.js';

function durationFromSummary(summary) {
  const start = Date.parse(summary?.startedAt || '');
  const end = Date.parse(summary?.finishedAt || '');
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null;
}

export async function runQaProfile({
  manifest,
  rootDir,
  profileName = 'quick',
  environment: requestedEnvironment,
  viewport: requestedViewport,
  outputRoot = 'qa-artifacts',
  demoProfile = null,
  demoAdapter = null,
  releaseOverride = false,
  releaseOverrideReason = null,
} = {}) {
  const profile = resolveQaProfile(manifest, profileName);
  const { name: environmentName, environment } = resolveEnvironment(manifest, requestedEnvironment);
  const viewport = resolveViewport(manifest, requestedViewport);
  const results = [];

  for (const flow of profile.flows) {
    const { file: flowFile } = resolveFlow(manifest, flow, rootDir);
    try {
      const result = await runQaFlow({ manifest, rootDir, environmentName, environment, flowName: flow, flowFile, viewport, outputRoot, demoProfile, demoAdapter });
      results.push({ flow, status: 'passed', critical: profile.criticalFlows.includes(flow), durationMs: durationFromSummary(result.summary), outputDir: result.outputDir, summary: result.summary });
    } catch (error) {
      results.push({ flow, status: 'failed', critical: profile.criticalFlows.includes(flow), error: error?.message || String(error), summary: error?.summary || null });
      if (profile.name === 'quick' && profile.stopOnFailure !== false) break;
    }
  }

  if (profile.includeDesktop && manifest.desktop?.executable) {
    const executable = path.resolve(rootDir, manifest.desktop.executable);
    try {
      const desktop = await runDesktopSmoke({ executable, args: manifest.desktop.args || [], cwd: manifest.desktop.cwd ? path.resolve(rootDir, manifest.desktop.cwd) : rootDir, env: environment.env, startupGraceMs: manifest.desktop.startupGraceMs, shutdownTimeoutMs: manifest.desktop.shutdownTimeoutMs });
      results.push({ check: 'desktop-smoke', status: 'passed', critical: profile.name === 'release', durationMs: desktop.durationMs });
    } catch (error) {
      results.push({ check: 'desktop-smoke', status: 'failed', critical: profile.name === 'release', error: error?.message || String(error) });
    }
  }

  const gate = evaluateReleaseGate({ profile: profile.name, results, override: releaseOverride, overrideReason: releaseOverrideReason });
  const report = aggregateQaReport({ systemId: manifest.systemId, profile: profile.name, runs: results, gate });
  const files = await writeQaReport({ report, outputRoot });
  if (profile.name === 'release' && !gate.allowed) {
    const error = new Error(`QA release gate failed for ${manifest.systemId}`);
    error.report = report;
    error.reportFiles = files;
    throw error;
  }
  return { profile, results, gate, report, ...files };
}
