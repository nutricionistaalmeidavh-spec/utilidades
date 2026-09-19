#!/usr/bin/env node
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { parseJsonText, publishGitHubFailure, publishGitHubSuccess, summarizeRelease } from '../src/index.mjs';
import { normalizeLegacyPhase5QaReport } from '../src/legacy-phase5.mjs';

async function exists(target) {
  try { await access(target, fsConstants.F_OK); return true; } catch { return false; }
}

async function readJson(target) {
  if (!target || !(await exists(target))) return null;
  try { return parseJsonText(await readFile(target, 'utf8')); } catch { return null; }
}

async function readText(target) {
  if (!target || !(await exists(target))) return '';
  try { return await readFile(target, 'utf8'); } catch { return ''; }
}

async function findInstallers(dir, pattern) {
  if (!dir || !(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const regex = new RegExp(pattern || 'Setup\\.exe$', 'i');
  return entries.filter((entry) => entry.isFile() && regex.test(entry.name)).map((entry) => path.join(dir, entry.name));
}

async function main() {
  const workspace = process.env.CI_WORKSPACE || process.cwd();
  const reportPath = process.env.ARTISYS_REPORT_PATH || path.join(workspace, 'artifacts', 'artisys-release-report.json');
  const qaReportPath = process.env.ARTISYS_QA_REPORT_PATH || path.join(workspace, 'artifacts', 'qa-summary.json');
  const logPath = process.env.ARTISYS_LOG_PATH || path.join(workspace, 'artifacts', 'woodpecker-release.log');
  const installerDir = process.env.ARTISYS_INSTALLER_DIR || path.join(workspace, 'dist');
  const installerPattern = process.env.ARTISYS_INSTALLER_PATTERN || 'Setup\\.exe$';
  const legacyQaDir = path.join(workspace, 'qa-artifacts');
  const legacySurfacePath = path.join(legacyQaDir, 'phase5-summary.json');
  const legacyPlaywrightPath = path.join(legacyQaDir, 'playwright-summary.json');
  const legacyFallbackPath = path.join(legacyQaDir, 'phase5-fallback-summary.json');
  const legacyRawLogPath = path.join(legacyQaDir, 'phase5-raw.log');
  const workspaceExists = await exists(workspace);

  const [
    report,
    qaReport,
    logText,
    installerPaths,
    legacySurface,
    legacyPlaywright,
    legacyFallback,
    legacyRawLog,
  ] = await Promise.all([
    readJson(reportPath),
    readJson(qaReportPath),
    readText(logPath),
    findInstallers(installerDir, installerPattern),
    readJson(legacySurfacePath),
    readJson(legacyPlaywrightPath),
    readJson(legacyFallbackPath),
    readText(legacyRawLogPath),
  ]);

  const effectiveQaReport = qaReport || normalizeLegacyPhase5QaReport({
    surface: legacySurface,
    playwright: legacyPlaywright,
    fallback: legacyFallback,
    rawLog: legacyRawLog,
    artifacts: {
      log: legacyRawLogPath,
      phase5Summary: legacySurfacePath,
      playwrightSummary: legacyPlaywrightPath,
      fallbackSummary: legacyFallbackPath,
    },
  });

  const summary = summarizeRelease({
    report,
    qaReport: effectiveQaReport,
    logText,
    installerPaths,
    fallbackStep: process.env.ARTISYS_FAILED_STEP || (workspaceExists ? 'workflow' : 'clone-or-workflow'),
    fallbackMessage: process.env.ARTISYS_FAILURE_MESSAGE || (workspaceExists
      ? 'Pipeline falhou antes de gerar um relatório detalhado.'
      : 'Pipeline falhou antes de o workspace ficar disponível; provável falha de clone ou preparação do workflow.'),
  });

  const common = {
    token: process.env.GITHUB_REPORT_TOKEN,
    repo: process.env.CI_REPO,
    sha: process.env.CI_COMMIT_SHA,
    branch: process.env.CI_COMMIT_BRANCH,
    sourceBranch: process.env.CI_COMMIT_SOURCE_BRANCH,
    pipelineUrl: process.env.CI_PIPELINE_URL,
    statusContext: process.env.ARTISYS_STATUS_CONTEXT || 'ci/woodpecker/release-detail',
    summary,
  };
  const resultMode = String(process.env.ARTISYS_CI_RESULT || 'failure').toLowerCase();
  const result = resultMode === 'success'
    ? await publishGitHubSuccess({ ...common, comment: process.env.ARTISYS_COMMENT_SUCCESS === 'true' })
    : await publishGitHubFailure(common);

  console.log(`[ArtiSys CI Reporter] ${resultMode} publicado para ${process.env.CI_REPO}@${String(process.env.CI_COMMIT_SHA || '').slice(0, 12)}; PR ${result.prNumber ?? 'n/a'}`);
}

main().catch((error) => {
  console.error(`[ArtiSys CI Reporter] ${error.stack || error.message}`);
  process.exitCode = 1;
});
