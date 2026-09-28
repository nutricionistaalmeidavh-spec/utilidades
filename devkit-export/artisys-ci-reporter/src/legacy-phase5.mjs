function clean(value) {
  return typeof value === 'string'
    ? value.replace(/\u0000/g, '').replace(/\u001b\[[0-9;]*m/g, '').trim()
    : '';
}

function statusOf(value) {
  const status = clean(value).toLowerCase();
  if (status === 'passed' || status === 'pass' || status === 'success') return 'PASS';
  if (status === 'failed' || status === 'fail' || status === 'failure') return 'FAIL';
  return status ? status.toUpperCase() : 'UNKNOWN';
}

function genericFallback(value) {
  const text = clean(value).toLowerCase();
  return !text
    || text.includes('sem diagnostico estruturado')
    || text.includes('consulte phase5-raw.log');
}

function rawTail(rawLog, maxLines = 24, maxChars = 5000) {
  const text = clean(rawLog);
  if (!text) return '';
  const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(-maxLines);
  const joined = lines.join('\n');
  return joined.length > maxChars ? joined.slice(joined.length - maxChars) : joined;
}

function failureText({ preferred, fallback, rawLog }) {
  const direct = clean(preferred);
  if (direct) return direct;
  const legacy = clean(fallback);
  if (legacy && !genericFallback(legacy)) return legacy;
  return rawTail(rawLog) || legacy || 'Falha do Phase 5 sem saída capturada.';
}

function failureStep(name, error) {
  return { name, action: null, error };
}

export function normalizeLegacyPhase5QaReport({
  surface = null,
  playwright = null,
  fallback = null,
  rawLog = '',
  artifacts = {},
} = {}) {
  const flows = [];
  const fallbackStage = clean(fallback?.failedStage) || 'phase5';
  const fallbackFailure = clean(fallback?.lastFailure);

  if (surface && typeof surface === 'object') {
    const status = statusOf(surface.status);
    const flow = { flow: 'qa:surface', status };
    if (status === 'FAIL') {
      const error = failureText({
        preferred: surface.error,
        fallback: fallbackStage === 'qa:surface' ? fallbackFailure : '',
        rawLog,
      });
      flow.error = error;
      flow.failedStep = failureStep('qa:surface', error);
    }
    flows.push(flow);
  }

  if (playwright && typeof playwright === 'object') {
    const status = statusOf(playwright.status);
    const flow = { flow: 'qa:web', status };
    if (status === 'FAIL') {
      const error = failureText({
        preferred: playwright.error,
        fallback: fallbackStage === 'qa:web' ? fallbackFailure : '',
        rawLog,
      });
      flow.error = error;
      flow.failedStep = failureStep('qa:web', error);
    }
    flows.push(flow);
  }

  if (!flows.length && fallback && typeof fallback === 'object') {
    const error = failureText({ preferred: '', fallback: fallbackFailure, rawLog });
    flows.push({
      flow: fallbackStage,
      status: 'FAIL',
      error,
      failedStep: failureStep(fallbackStage, error),
    });
  }

  if (!flows.length && clean(rawLog)) {
    const error = rawTail(rawLog);
    flows.push({
      flow: 'phase5',
      status: 'FAIL',
      error,
      failedStep: failureStep('phase5', error),
    });
  }

  if (!flows.length) return null;

  const flowsPassed = flows.filter(flow => flow.status === 'PASS').length;
  const flowsFailed = flows.filter(flow => flow.status === 'FAIL').length;

  return {
    schemaVersion: 2,
    source: '@artisys/ci-reporter:legacy-phase5',
    status: flowsFailed ? 'FAIL' : 'PASS',
    counts: { flowsPassed, flowsFailed },
    flows,
    artifacts: artifacts && typeof artifacts === 'object' ? artifacts : {},
  };
}
