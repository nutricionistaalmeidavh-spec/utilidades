import path from 'node:path';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_REPEAT = 1_000_000;

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function string(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value.trim();
}

function positiveInteger(value, fallback, name, max = Number.MAX_SAFE_INTEGER) {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) throw new TypeError(`${name} must be a positive integer`);
  return parsed;
}

function normalizeStep(value, index, kind) {
  object(value, `${kind}[${index}]`);
  const id = string(value.id, `${kind}[${index}].id`);
  return Object.freeze({
    ...value,
    id,
    required: value.required !== false,
    timeoutMs: positiveInteger(value.timeoutMs, DEFAULT_TIMEOUT_MS, `${id}.timeoutMs`),
    repeat: positiveInteger(value.repeat, 1, `${id}.repeat`, MAX_REPEAT),
    action: value.action == null ? null : object(value.action, `${id}.action`)
  });
}

function normalizeList(values, kind, { required = false } = {}) {
  if (values == null && !required) return Object.freeze([]);
  if (!Array.isArray(values) || (required && values.length === 0)) throw new TypeError(`${kind} must be ${required ? 'a non-empty ' : 'an '}array`);
  const normalized = values.map((value, index) => normalizeStep(value, index, kind));
  const ids = new Set();
  for (const item of normalized) {
    if (ids.has(item.id)) throw new TypeError(`duplicate ${kind} id: ${item.id}`);
    ids.add(item.id);
  }
  return Object.freeze(normalized);
}

export function defineValidationProfile(value) {
  object(value, 'profile');
  const product = string(value.product, 'product');
  if (value.schemaVersion !== 1) throw new TypeError('schemaVersion must be 1');
  const version = string(value.version, 'version');
  const artifact = string(value.artifact, 'artifact');
  const workspace = string(value.workspace, 'workspace');
  const reportDir = value.reportDir == null ? path.join(workspace, 'release-validation') : string(value.reportDir, 'reportDir');
  const redact = value.redact == null ? [] : value.redact;
  if (!Array.isArray(redact) || redact.some(item => typeof item !== 'string' || !item)) throw new TypeError('redact must be an array of non-empty strings');

  const profile = {
    ...value,
    schemaVersion: 1,
    product,
    version,
    artifact,
    workspace,
    reportDir,
    phases: normalizeList(value.phases, 'phases', { required: true }),
    scenarios: normalizeList(value.scenarios, 'scenarios'),
    redact: Object.freeze([...redact])
  };
  return Object.freeze(profile);
}

export { DEFAULT_TIMEOUT_MS };
