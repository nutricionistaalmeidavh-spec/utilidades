function normalizeOutcome(raw) {
  if (!raw || typeof raw !== 'object') return { status: 'fail', reason: 'invalid-result' };
  if (!['pass', 'fail', 'skipped'].includes(raw.status)) return { ...raw, status: 'fail', reason: raw.reason || 'invalid-status' };
  return { ...raw };
}

function withTimeout(promiseFactory, timeoutMs, id) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error(`${id} timed out after ${timeoutMs}ms`);
      error.code = 'VALIDATION_TIMEOUT';
      reject(error);
    }, timeoutMs);
    Promise.resolve()
      .then(promiseFactory)
      .then(value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

function safeError(error) {
  return String(error?.message || error || 'unknown-error');
}

export async function runValidation({
  profile,
  executePhase,
  now = () => new Date().toISOString(),
  clock = () => Date.now()
} = {}) {
  if (!profile || typeof profile !== 'object') throw new TypeError('profile is required');
  if (typeof executePhase !== 'function') throw new TypeError('executePhase must be a function');

  const startedAt = now();
  const startedClock = clock();
  const phases = [];
  const failedRequired = [];
  const context = Object.freeze({ profile });

  for (const phase of profile.phases) {
    const phaseStarted = clock();
    const iterations = [];
    let status = 'pass';
    let reason = null;
    let attempts = 0;

    for (let iteration = 1; iteration <= phase.repeat; iteration += 1) {
      attempts = iteration;
      let outcome;
      try {
        outcome = normalizeOutcome(await withTimeout(
          () => executePhase(phase, context, iteration),
          phase.timeoutMs,
          phase.id
        ));
      } catch (error) {
        outcome = {
          status: 'fail',
          reason: error?.code === 'VALIDATION_TIMEOUT' ? 'timeout' : safeError(error),
          error: safeError(error)
        };
      }
      iterations.push({ iteration, ...outcome });
      status = outcome.status;
      reason = outcome.reason || null;
      if (status !== 'pass') break;
    }

    const phaseResult = {
      id: phase.id,
      required: phase.required,
      status,
      attempts,
      durationMs: Math.max(0, clock() - phaseStarted)
    };
    if (reason) phaseResult.reason = reason;
    if (phase.repeat > 1 || iterations.some(item => Object.keys(item).length > 2)) phaseResult.iterations = iterations;
    phases.push(phaseResult);

    if (phase.required && status !== 'pass') {
      failedRequired.push(phase.id);
      break;
    }
  }

  const finishedAt = now();
  return {
    status: failedRequired.length ? 'BLOCKED' : 'APPROVED',
    product: profile.product,
    version: profile.version,
    artifact: { path: profile.artifact, sha256: null },
    startedAt,
    finishedAt,
    durationMs: Math.max(0, clock() - startedClock),
    phases,
    failedRequired
  };
}
