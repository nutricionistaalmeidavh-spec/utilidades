const DEFAULT_API = 'https://api.github.com';
const DEFAULT_PUBLIC_CI = 'https://ci.artisys.dev';

function cleanText(value) {
  return typeof value === 'string'
    ? value.replace(/\u0000/g, '').replace(/\u001b\[[0-9;]*m/g, '').trim()
    : '';
}

export function parseJsonText(value) {
  return JSON.parse(String(value ?? '').replace(/^\uFEFF/, ''));
}

export function tailLines(value, maxLines = 40, maxChars = 6000) {
  const text = cleanText(value);
  if (!text) return '';
  const lines = text.split(/\r?\n/).slice(-maxLines);
  const joined = lines.join('\n');
  return joined.length > maxChars ? joined.slice(joined.length - maxChars) : joined;
}

export function publicPipelineUrl(value, publicBase = DEFAULT_PUBLIC_CI) {
  const url = cleanText(value);
  if (!url) return publicBase;
  return url
    .replace(/^http:\/\/localhost:8000/i, publicBase)
    .replace(/^http:\/\/127\.0\.0\.1:8000/i, publicBase);
}

function gatesFromReport(report) {
  if (!Array.isArray(report?.steps)) return [];
  return report.steps.map((step) => ({
    id: cleanText(step?.id) || 'unknown',
    status: cleanText(step?.status) || 'unknown',
    exitCode: Number.isInteger(step?.exitCode) ? step.exitCode : null,
  }));
}

function gatesText(gates) {
  if (!Array.isArray(gates) || !gates.length) return '';
  return gates.map((gate) => `${gate.id}: ${gate.status}${gate.exitCode == null ? '' : ` (exit ${gate.exitCode})`}`).join('\n');
}

function normalizeBlockingFinding(finding) {
  const packageName = cleanText(finding?.package) || cleanText(finding?.packageName) || null;
  return {
    severity: cleanText(finding?.severity).toLowerCase() || 'unknown',
    tool: cleanText(finding?.tool) || cleanText(finding?.source) || 'unknown',
    ruleId: cleanText(finding?.ruleId) || cleanText(finding?.rule) || cleanText(finding?.id) || 'unknown',
    message: cleanText(finding?.message) || cleanText(finding?.title) || cleanText(finding?.description) || 'Finding sem mensagem capturada.',
    path: cleanText(finding?.path) || cleanText(finding?.file) || cleanText(finding?.target) || null,
    url: cleanText(finding?.url) || null,
    package: packageName,
    version: cleanText(finding?.version) || cleanText(finding?.installedVersion) || null,
    evidence: cleanText(finding?.evidence) || cleanText(finding?.fingerprint) || cleanText(finding?.diagnostic) || null,
    remediation: cleanText(finding?.remediation) || cleanText(finding?.fix) || cleanText(finding?.recommendation) || null,
  };
}

export function summarizeBlockingFindings(report) {
  if (!report || typeof report !== 'object') return [];
  const source = Array.isArray(report.blockingFindings)
    ? report.blockingFindings
    : Array.isArray(report.findings)
      ? report.findings
      : [];
  return source
    .map(normalizeBlockingFinding)
    .filter((finding) => finding.severity === 'critical' || finding.severity === 'high');
}

function blockingFindingsDiagnosticText(findings) {
  if (!Array.isArray(findings) || !findings.length) return '';
  const lines = ['Findings bloqueantes:'];
  for (const finding of findings) {
    const location = finding.path ? ` [${finding.path}]` : '';
    const pkg = finding.package ? ` | package=${finding.package}${finding.version ? `@${finding.version}` : ''}` : '';
    const evidence = finding.evidence ? ` | evidence=${finding.evidence}` : '';
    const remediation = finding.remediation ? ` | remediation=${finding.remediation}` : '';
    lines.push(`${finding.severity.toUpperCase()} ${finding.tool}/${finding.ruleId}: ${finding.message}${location}${pkg}${evidence}${remediation}`);
  }
  return lines.join('\n');
}

function flowFailureDetails(flow) {
  const flowSummary = flow?.summary && typeof flow.summary === 'object' ? flow.summary : null;
  const failedStep = Array.isArray(flowSummary?.steps)
    ? flowSummary.steps.find((step) => step?.status === 'failed') ?? null
    : null;
  const evidence = flow?.evidence && typeof flow.evidence === 'object' ? flow.evidence : {};
  const outputDir = cleanText(flow?.outputDir) || cleanText(evidence?.outputDir) || null;
  const screenshot = cleanText(evidence?.screenshot)
    || (outputDir ? `${outputDir}\\screenshots\\failure.png` : null);
  const trace = cleanText(evidence?.trace)
    || (outputDir ? `${outputDir}\\trace.zip` : null);
  const runSummary = cleanText(evidence?.runSummary)
    || (outputDir ? `${outputDir}\\run-summary.json` : null);
  return {
    flow: cleanText(flow?.flow) || cleanText(flowSummary?.flow) || 'unknown',
    step: cleanText(flow?.failedStep?.name)
      || cleanText(flow?.failedStep?.action)
      || cleanText(failedStep?.name)
      || cleanText(failedStep?.action)
      || null,
    error: cleanText(flow?.failedStep?.error)
      || cleanText(failedStep?.error)
      || cleanText(flowSummary?.failure?.message)
      || cleanText(flow?.error)
      || 'Falha sem detalhe capturado.',
    outputDir,
    screenshot,
    trace,
    runSummary,
  };
}

export function summarizeQaReport(qaReport) {
  if (!qaReport || typeof qaReport !== 'object') return null;
  const flows = Array.isArray(qaReport.flows) ? qaReport.flows : [];
  const passed = Number.isInteger(qaReport?.counts?.flowsPassed)
    ? qaReport.counts.flowsPassed
    : flows.filter((flow) => flow?.status === 'PASS').length;
  const failed = Number.isInteger(qaReport?.counts?.flowsFailed)
    ? qaReport.counts.flowsFailed
    : flows.filter((flow) => flow?.status === 'FAIL').length;
  const failures = flows.filter((flow) => flow?.status === 'FAIL').map(flowFailureDetails);
  return {
    status: cleanText(qaReport.status) || (failed ? 'FAIL' : 'PASS'),
    passed,
    failed,
    total: passed + failed,
    failures,
  };
}

function qaDiagnosticText(qa) {
  if (!qa || !Array.isArray(qa.failures) || !qa.failures.length) return '';
  const header = `QA ${qa.passed}/${qa.total} PASS; ${qa.failed} FAIL`;
  const failures = qa.failures.map((failure) => {
    const step = failure.step ? ` | etapa: ${failure.step}` : '';
    return `${failure.flow}${step} | ${failure.error}`;
  });
  return [header, ...failures].join('\n');
}

export function summarizeRelease({ report = null, qaReport = null, logText = '', installerPaths = [], installerRequired = process.env.ARTISYS_INSTALLER_REQUIRED !== 'false', fallbackStep = 'workflow', fallbackMessage = '' } = {}) {
  const installerPath = Array.isArray(installerPaths) && installerPaths.length ? installerPaths[0] : null;
  const requiresInstaller = installerRequired !== false;
  const reportPassedWithoutInstaller = requiresInstaller && report?.status === 'pass' && !installerPath;
  const failedStepId = report?.failedStep || (reportPassedWithoutInstaller ? 'evidence/installer' : fallbackStep);
  const failedStep = Array.isArray(report?.steps)
    ? report.steps.find((step) => step?.id === failedStepId) ?? null
    : null;
  const gates = gatesFromReport(report);
  const qa = summarizeQaReport(qaReport);
  const blockingFindings = summarizeBlockingFindings(report);
  const reportDiagnostic = report
    ? `artisys-release status: ${report.status || 'unknown'}${gates.length ? `\n${gatesText(gates)}` : ''}${reportPassedWithoutInstaller ? '\nInstaller esperado nao foi encontrado na validacao final.' : ''}`
    : '';
  const diagnostic = qaDiagnosticText(qa)
    || blockingFindingsDiagnosticText(blockingFindings)
    || cleanText(failedStep?.stderr)
    || cleanText(failedStep?.stdout)
    || cleanText(reportDiagnostic)
    || cleanText(logText)
    || cleanText(fallbackMessage)
    || 'Falha sem saída capturada.';
  return {
    status: report?.status || 'failure',
    reportStatus: report?.status || null,
    failedStep: failedStepId,
    exitCode: Number.isInteger(failedStep?.exitCode) ? failedStep.exitCode : null,
    command: cleanText(failedStep?.command) || null,
    errorExcerpt: tailLines(diagnostic),
    installerRequired: requiresInstaller,
    installerFound: Boolean(installerPath),
    installerPath,
    gates,
    stepsSummary: gatesText(gates),
    blockingFindings,
    qa,
  };
}

export function truncateDescription(value, max = 140) {
  const text = cleanText(value).replace(/\s+/g, ' ');
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

function commonMarkdown({ repo, sha, branch, pipelineUrl, summary, title }) {
  const shortSha = cleanText(sha).slice(0, 12) || 'desconhecido';
  const safeRepo = cleanText(repo) || 'repositorio-desconhecido';
  const product = safeRepo.split('/').pop() || safeRepo;
  const url = publicPipelineUrl(pipelineUrl);
  const installer = summary?.installerRequired === false
    ? 'NÃO SE APLICA'
    : summary?.installerFound
      ? `SIM — \`${summary.installerPath}\``
      : 'NÃO';
  const lines = [
    `<!-- artisys-woodpecker-report:${shortSha} -->`,
    `## ${product} — ${title}`,
    '',
    `- Commit: \`${shortSha}\``,
    `- Branch: \`${cleanText(branch) || 'desconhecida'}\``,
    `- Instalador gerado: ${installer}`,
    `- Pipeline: ${url}`,
  ];
  if (Array.isArray(summary?.gates) && summary.gates.length) {
    lines.push('', '### Gates', '```text', gatesText(summary.gates), '```');
  }
  return { lines, shortSha, product, url };
}

function appendBlockingFindingsMarkdown(lines, findings) {
  if (!Array.isArray(findings) || !findings.length) return;
  lines.push('', '### Findings bloqueantes', `- Total: **${findings.length}**`);
  for (const finding of findings) {
    lines.push('', `#### ${finding.severity.toUpperCase()} — \`${finding.tool}/${finding.ruleId}\```, `- Mensagem: ${finding.message}`);
    if (finding.path) lines.push(`- Arquivo/alvo: \`${finding.path}\``);
    if (finding.url) lines.push(`- URL: ${finding.url}`);
    if (finding.package) lines.push(`- Pacote: \`${finding.package}${finding.version ? `@${finding.version}` : ''}\``);
    if (finding.evidence) lines.push(`- Evidência: ${finding.evidence}`);
    if (finding.remediation) lines.push(`- Remediação: ${finding.remediation}`);
  }
}

function appendQaMarkdown(lines, qa) {
  if (!qa) return;
  lines.push('', '### QA detalhado', `- Fluxos: **${qa.passed}/${qa.total} PASS**${qa.failed ? ` — **${qa.failed} FAIL**` : ''}`);
  if (!qa.failures?.length) return;
  for (const failure of qa.failures) {
    lines.push('', `#### FAIL — \`${failure.flow}\``);
    if (failure.step) lines.push(`- Etapa: \`${failure.step}\``);
    lines.push(`- Erro: ${failure.error}`);
    if (failure.screenshot) lines.push(`- Screenshot: \`${failure.screenshot}\``);
    if (failure.trace) lines.push(`- Trace: \`${failure.trace}\``);
    if (failure.runSummary) lines.push(`- Run summary: \`${failure.runSummary}\``);
  }
}

export function buildFailureMarkdown({ repo, sha, branch, pipelineUrl, summary }) {
  const { lines } = commonMarkdown({ repo, sha, branch, pipelineUrl, summary, title: 'Woodpecker falhou' });
  const exitCode = summary?.exitCode == null ? 'indisponível' : String(summary.exitCode);
  const command = summary?.command ? `\n- Comando: \`${summary.command}\`` : '';
  const reportStatus = summary?.reportStatus ? `\n- artisys-release: \`${summary.reportStatus}\`` : '';
  lines.splice(5, 0,
    `- Step: \`${cleanText(summary?.failedStep) || 'workflow'}\``,
    `- Exit code: \`${exitCode}\`${command}${reportStatus}`,
  );
  appendBlockingFindingsMarkdown(lines, summary?.blockingFindings);
  appendQaMarkdown(lines, summary?.qa);
  lines.push('', '### Erro capturado', '```text', tailLines(summary?.errorExcerpt || 'Falha sem saída capturada.', 40, 6000), '```', '', '_Relatório automático ArtiSys / Woodpecker._');
  return lines.join('\n');
}

export function buildSuccessMarkdown({ repo, sha, branch, pipelineUrl, summary }) {
  const { lines } = commonMarkdown({ repo, sha, branch, pipelineUrl, summary, title: 'Woodpecker aprovado' });
  appendQaMarkdown(lines, summary?.qa);
  lines.push('', '_Relatório automático ArtiSys / Woodpecker._');
  return lines.join('\n');
}

async function githubRequest(url, { token, method = 'GET', body = null, fetchImpl = globalThis.fetch }) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  const response = await fetchImpl(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'artisys-ci-reporter',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const detail = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`GitHub API ${method} ${url} falhou (${response.status}): ${detail}`);
  }
  if (response.status === 204) return null;
  return typeof response.json === 'function' ? response.json() : null;
}

async function findOpenPr({ token, repo, branch, sourceBranch, fetchImpl, apiBase }) {
  const [owner] = repo.split('/');
  const headBranch = cleanText(sourceBranch) || cleanText(branch);
  if (!headBranch) return null;
  try {
    const query = new URLSearchParams({ state: 'open', head: `${owner}:${headBranch}`, per_page: '10' });
    const pulls = await githubRequest(`${apiBase}/repos/${repo}/pulls?${query}`, { token, fetchImpl });
    return Array.isArray(pulls) && pulls.length ? pulls[0].number : null;
  } catch (error) {
    console.warn(`[ArtiSys CI Reporter] Consulta de PR ignorada: ${error.message}`);
    return null;
  }
}

async function publishComment({ token, repo, sha, prNumber, markdown, fetchImpl, apiBase }) {
  await githubRequest(`${apiBase}/repos/${repo}/commits/${sha}/comments`, { token, method: 'POST', body: { body: markdown }, fetchImpl });
  if (prNumber) {
    try {
      await githubRequest(`${apiBase}/repos/${repo}/issues/${prNumber}/comments`, { token, method: 'POST', body: { body: markdown }, fetchImpl });
    } catch (error) {
      console.warn(`[ArtiSys CI Reporter] Comentario no PR #${prNumber} nao publicado: ${error.message}`);
    }
  }
}

function validatePublishInput({ token, repo, sha }) {
  if (!cleanText(token)) throw new Error('GITHUB_REPORT_TOKEN ausente.');
  if (!cleanText(repo) || !repo.includes('/')) throw new Error('CI_REPO invalido ou ausente.');
  if (!cleanText(sha)) throw new Error('CI_COMMIT_SHA ausente.');
}

export async function publishGitHubFailure({ token, repo, sha, branch, sourceBranch = null, pipelineUrl, summary, statusContext = 'ci/woodpecker/release-detail', fetchImpl = globalThis.fetch, apiBase = DEFAULT_API }) {
  validatePublishInput({ token, repo, sha });
  const publicUrl = publicPipelineUrl(pipelineUrl);
  const markdown = buildFailureMarkdown({ repo, sha, branch, pipelineUrl: publicUrl, summary });
  const qaSuffix = summary?.qa?.failed ? `; QA ${summary.qa.passed}/${summary.qa.total}` : '';
  const findingSuffix = Array.isArray(summary?.blockingFindings) && summary.blockingFindings.length
    ? `; blockers ${summary.blockingFindings.length}`
    : '';
  const installerSuffix = summary?.installerRequired === false ? '' : `; installer ${summary?.installerFound ? 'gerado' : 'nao gerado'}`;
  const description = truncateDescription(`${summary?.failedStep || 'workflow'} falhou${summary?.exitCode == null ? '' : ` (exit ${summary.exitCode})`}${qaSuffix}${findingSuffix}${installerSuffix}`);
  await githubRequest(`${apiBase}/repos/${repo}/statuses/${sha}`, { token, method: 'POST', body: { state: 'failure', target_url: publicUrl, description, context: statusContext }, fetchImpl });
  const prNumber = await findOpenPr({ token, repo, branch, sourceBranch, fetchImpl, apiBase });
  await publishComment({ token, repo, sha, prNumber, markdown, fetchImpl, apiBase });
  return { prNumber, markdown, description, pipelineUrl: publicUrl };
}

export async function publishGitHubSuccess({ token, repo, sha, branch, sourceBranch = null, pipelineUrl, summary, statusContext = 'ci/woodpecker/release-detail', comment = false, fetchImpl = globalThis.fetch, apiBase = DEFAULT_API }) {
  validatePublishInput({ token, repo, sha });
  const publicUrl = publicPipelineUrl(pipelineUrl);
  const markdown = buildSuccessMarkdown({ repo, sha, branch, pipelineUrl: publicUrl, summary });
  const qaSuffix = summary?.qa?.total ? `; QA ${summary.qa.passed}/${summary.qa.total}` : '';
  const installerSuffix = summary?.installerRequired === false ? '' : `; installer ${summary?.installerFound ? 'gerado' : 'nao aplicavel'}`;
  const description = truncateDescription(`pipeline aprovado${qaSuffix}${installerSuffix}`);
  await githubRequest(`${apiBase}/repos/${repo}/statuses/${sha}`, { token, method: 'POST', body: { state: 'success', target_url: publicUrl, description, context: statusContext }, fetchImpl });
  let prNumber = null;
  if (comment) {
    prNumber = await findOpenPr({ token, repo, branch, sourceBranch, fetchImpl, apiBase });
    await publishComment({ token, repo, sha, prNumber, markdown, fetchImpl, apiBase });
  }
  return { prNumber, markdown, description, pipelineUrl: publicUrl };
}
