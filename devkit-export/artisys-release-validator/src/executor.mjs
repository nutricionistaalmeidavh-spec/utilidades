import { runCommand } from './adapters/command.mjs';
import { probeHttp } from './adapters/http.mjs';
import { createNsisInstallSpec, createNsisUninstallSpec } from './adapters/nsis.mjs';

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
    timer.unref?.();
    Promise.resolve().then(promiseFactory).then(value => {
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

async function executeAction(action, owner, profile) {
  if (!action || typeof action !== 'object') return { status: 'fail', reason: 'action-missing' };
  switch (action.type) {
    case 'noop':
      return { status: 'pass' };
    case 'command':
      return runCommand({
        ...action,
        timeoutMs: action.timeoutMs ?? owner.timeoutMs,
        redact: [...profile.redact, ...(action.redact ?? [])]
      });
    case 'http':
      return probeHttp({ ...action, timeoutMs: action.timeoutMs ?? owner.timeoutMs });
    case 'nsis-install':
      return runCommand(createNsisInstallSpec({
        ...action,
        installer: action.installer || profile.artifact,
        timeoutMs: action.timeoutMs ?? owner.timeoutMs,
        redact: [...profile.redact, ...(action.redact ?? [])]
      }));
    case 'nsis-uninstall':
      return runCommand(createNsisUninstallSpec({
        ...action,
        timeoutMs: action.timeoutMs ?? owner.timeoutMs,
        redact: [...profile.redact, ...(action.redact ?? [])]
      }));
    default:
      return { status: 'fail', reason: `unsupported-action:${String(action.type || 'unknown')}` };
  }
}

async function executeScenarios(profile, ids = null) {
  const selected = ids == null
    ? profile.scenarios
    : ids.map(id => profile.scenarios.find(item => item.id === id)).filter(Boolean);
  if (ids && selected.length !== ids.length) return { status: 'fail', reason: 'scenario-not-found' };
  const results = [];
  for (const scenario of selected) {
    let status = 'pass';
    let reason = null;
    let attempts = 0;
    for (let iteration = 1; iteration <= scenario.repeat; iteration += 1) {
      attempts = iteration;
      try {
        const result = await withTimeout(() => executeAction(scenario.action, scenario, profile), scenario.timeoutMs, scenario.id);
        status = result?.status || 'fail';
        reason = result?.reason || null;
      } catch (error) {
        status = 'fail';
        reason = error?.code === 'VALIDATION_TIMEOUT' ? 'timeout' : String(error?.message || error);
      }
      if (status !== 'pass') break;
    }
    results.push({ id: scenario.id, required: scenario.required, status, attempts, reason });
    if (scenario.required && status !== 'pass') return { status: 'fail', reason: `scenario:${scenario.id}`, scenarios: results };
  }
  return { status: 'pass', scenarios: results };
}

export function createPhaseExecutor({ profile } = {}) {
  if (!profile || typeof profile !== 'object') throw new TypeError('profile is required');
  return async function executePhase(phase) {
    const action = phase.action;
    if (action?.type === 'scenarios') return executeScenarios(profile, action.ids ?? null);
    return executeAction(action, phase, profile);
  };
}

export { executeScenarios };
