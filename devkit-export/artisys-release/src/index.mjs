import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';

function obj(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value.trim();
}

function stringList(value, name) {
  const list = [...(value ?? [])];
  if (!list.every((item) => typeof item === 'string' && item.trim())) throw new TypeError(`${name} must contain strings`);
  return list.map((item) => item.trim());
}

export function createReleasePlan(value) {
  obj(value, 'release plan');
  return {
    product: nonEmptyString(value.product, 'product'),
    version: nonEmptyString(value.version, 'version'),
    artifacts: [...(value.artifacts ?? [])],
    checks: [...(value.checks ?? ['qa', 'security', 'api-contracts', 'signing'])],
  };
}

export function evaluateReleaseResults(results) {
  if (!Array.isArray(results)) throw new TypeError('results must be an array');
  const failed = results.filter((result) => result.status !== 'pass');
  return { status: failed.length ? 'blocked' : 'pass', results: [...results], failedChecks: failed.map((result) => result.check) };
}

export async function runReleaseGate(runners, value) {
  const plan = createReleasePlan(value);
  const results = [];
  for (const check of plan.checks) {
    const run = runners?.[check];
    if (typeof run !== 'function') {
      results.push({ check, status: 'fail', reason: 'runner-missing' });
      break;
    }
    const raw = await run(plan);
    const result = { check, ...raw };
    results.push(result);
    if (result.status !== 'pass') break;
  }
  return evaluateReleaseResults(results);
}

export function hashArtifact(data) {
  return createHash('sha256').update(data).digest('hex');
}

export const PIPELINE_PROFILES = Object.freeze({
  quick: Object.freeze(['deps', 'lint', 'test', 'build']),
  full: Object.freeze(['deps', 'lint', 'test', 'build', 'installer', 'qa', 'security']),
  release: Object.freeze(['deps', 'lint', 'test', 'build', 'installer', 'qa', 'security', 'evidence', 'deploy', 'publish']),
});

function normalizeStep(id, value) {
  if (typeof value === 'string') return { id, command: value, cwd: null, env: {}, continueOnError: false, profiles: null };
  obj(value, `step ${id}`);
  const profiles = value.profiles == null ? null : stringList(value.profiles, `step ${id}.profiles`);
  if (profiles && !profiles.every((profile) => Object.hasOwn(PIPELINE_PROFILES, profile))) throw new TypeError(`step ${id}.profiles contains unknown profile`);
  return {
    id,
    command: nonEmptyString(value.command, `step ${id}.command`),
    cwd: value.cwd ?? null,
    env: { ...(value.env ?? {}) },
    continueOnError: value.continueOnError === true,
    profiles,
  };
}

export function normalizePipelineConfig(value) {
  obj(value, 'pipeline config');
  const profile = value.profile ?? 'full';
  if (!Object.hasOwn(PIPELINE_PROFILES, profile)) throw new TypeError(`unknown profile: ${profile}`);
  const requiredSteps = stringList(value.requiredSteps, 'requiredSteps');
  const rawRequiredByProfile = value.requiredStepsByProfile ?? {};
  obj(rawRequiredByProfile, 'requiredStepsByProfile');
  const requiredStepsByProfile = {};
  for (const [key, list] of Object.entries(rawRequiredByProfile)) {
    if (!Object.hasOwn(PIPELINE_PROFILES, key)) throw new TypeError(`requiredStepsByProfile contains unknown profile: ${key}`);
    requiredStepsByProfile[key] = stringList(list, `requiredStepsByProfile.${key}`);
  }
  const rawSteps = value.steps ?? {};
  obj(rawSteps, 'steps');
  const steps = Object.fromEntries(Object.entries(rawSteps).map(([id, step]) => [id, normalizeStep(id, step)]));
  return {
    product: nonEmptyString(value.product, 'product'),
    version: nonEmptyString(value.version, 'version'),
    profile,
    workspace: value.workspace ?? process.cwd(),
    requiredSteps,
    requiredStepsByProfile,
    steps,
    reportPath: value.reportPath ?? null,
    metadata: { ...(value.metadata ?? {}) },
  };
}

export function createPipelinePlan(value) {
  const config = normalizePipelineConfig(value);
  const required = new Set([...config.requiredSteps, ...(config.requiredStepsByProfile[config.profile] ?? [])]);
  const sequence = PIPELINE_PROFILES[config.profile];
  const steps = sequence.map((id) => {
    const step = config.steps[id];
    if (step && step.profiles && !step.profiles.includes(config.profile)) {
      return { ...step, status: 'skipped', required: false };
    }
    if (step) return { ...step, status: 'ready', required: required.has(id) };
    if (required.has(id)) return { id, command: null, cwd: null, env: {}, continueOnError: false, profiles: null, status: 'missing-required', required: true };
    return { id, command: null, cwd: null, env: {}, continueOnError: false, profiles: null, status: 'skipped', required: false };
  });
  return { ...config, requiredSteps: [...required], sequence: [...sequence], steps };
}

export async function defaultCommandExecutor(step, context = {}) {
  return await new Promise((resolve) => {
    const child = spawn(step.command, {
      cwd: step.cwd ? path.resolve(context.workspace ?? process.cwd(), step.cwd) : (context.workspace ?? process.cwd()),
      env: {
        ...process.env,
        ARTISYS_RELEASE_PRODUCT: context.product ?? '',
        ARTISYS_RELEASE_VERSION: context.version ?? '',
        ARTISYS_RELEASE_PROFILE: context.profile ?? '',
        ...(context.env ?? {}),
        ...(step.env ?? {}),
      },
      shell: true,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolve({ exitCode: 1, stdout, stderr: `${stderr}${error.message}` }));
    child.on('close', (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
  });
}

export async function runPipeline(value, options = {}) {
  const plan = createPipelinePlan(value);
  const executor = options.executor ?? defaultCommandExecutor;
  const dryRun = options.dryRun === true;
  const results = [];
  let failedStep = null;

  for (const step of plan.steps) {
    if (step.status === 'skipped') {
      results.push({ id: step.id, status: 'skipped', exitCode: null, stdout: '', stderr: '' });
      continue;
    }
    if (step.status === 'missing-required') {
      failedStep = step.id;
      results.push({ id: step.id, status: 'blocked', reason: 'required-step-missing', exitCode: null, stdout: '', stderr: '' });
      break;
    }
    if (dryRun) {
      results.push({ id: step.id, status: 'dry-run', command: step.command, exitCode: null, stdout: '', stderr: '' });
      continue;
    }

    if (typeof options.onStepStart === 'function') await options.onStepStart(step, plan);
    const raw = await executor(step, { workspace: plan.workspace, product: plan.product, version: plan.version, profile: plan.profile });
    const exitCode = Number.isInteger(raw?.exitCode) ? raw.exitCode : 1;
    const passed = exitCode === 0;
    const result = {
      id: step.id,
      status: passed ? 'pass' : step.continueOnError ? 'warning' : 'fail',
      command: step.command,
      exitCode,
      stdout: raw?.stdout ?? '',
      stderr: raw?.stderr ?? '',
    };
    results.push(result);
    if (typeof options.onStepComplete === 'function') await options.onStepComplete(result, plan);
    if (!passed && !step.continueOnError) {
      failedStep = step.id;
      break;
    }
  }

  return { product: plan.product, version: plan.version, profile: plan.profile, status: failedStep ? 'blocked' : 'pass', failedStep, steps: results, metadata: plan.metadata };
}

export function createJsonReport(result) {
  obj(result, 'pipeline result');
  return `${JSON.stringify({
    product: result.product,
    version: result.version,
    profile: result.profile,
    status: result.status,
    failedStep: result.failedStep ?? null,
    metadata: result.metadata ?? {},
    steps: (result.steps ?? []).map((step) => ({
      id: step.id,
      status: step.status,
      command: step.command ?? null,
      exitCode: step.exitCode ?? null,
      reason: step.reason ?? null,
      stdout: step.stdout ?? '',
      stderr: step.stderr ?? '',
    })),
  }, null, 2)}\n`;
}
