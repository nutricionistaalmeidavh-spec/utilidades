import { defineValidationProfile } from './profile.mjs';
import { runValidation } from './runner.mjs';
import { createPhaseExecutor } from './executor.mjs';
import { sha256File } from './artifact.mjs';
import { writeValidationReports } from './report.mjs';

function blockedArtifactResult(profile, error, now = () => new Date().toISOString()) {
  const stamp = now();
  return {
    status: 'BLOCKED',
    product: profile.product,
    version: profile.version,
    artifact: { path: profile.artifact, sha256: null },
    startedAt: stamp,
    finishedAt: stamp,
    durationMs: 0,
    phases: [{ id: 'artifact', required: true, status: 'fail', attempts: 1, durationMs: 0, reason: String(error?.message || error) }],
    failedRequired: ['artifact']
  };
}

export async function validateRelease({ profile: inputProfile, executePhase = null, writeReports = true } = {}) {
  const profile = defineValidationProfile(inputProfile);
  let sha256;
  try {
    sha256 = await sha256File(profile.artifact);
  } catch (error) {
    const blocked = blockedArtifactResult(profile, error);
    const reports = writeReports ? await writeValidationReports(blocked, profile.reportDir, { redact: profile.redact }) : null;
    return { ...blocked, reports };
  }

  const runner = executePhase || createPhaseExecutor({ profile });
  const result = await runValidation({ profile, executePhase: runner });
  const enriched = { ...result, artifact: { path: profile.artifact, sha256 } };
  const reports = writeReports ? await writeValidationReports(enriched, profile.reportDir, { redact: profile.redact }) : null;
  return { ...enriched, reports };
}

export { defineValidationProfile } from './profile.mjs';
export { runValidation } from './runner.mjs';
export { createPhaseExecutor, executeScenarios } from './executor.mjs';
export { runCommand, redactText } from './adapters/command.mjs';
export { probeHttp } from './adapters/http.mjs';
export { createNsisInstallSpec, createNsisUninstallSpec } from './adapters/nsis.mjs';
export { sha256File } from './artifact.mjs';
export { writeValidationReports, escapeHtml, redactValue } from './report.mjs';
