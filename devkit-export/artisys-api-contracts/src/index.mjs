import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export const GENERATOR_VERSION = '7.16.0';

/** Stable serialization: object ordering does not cause drift; array order does. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    throw new TypeError('Contract must contain JSON values only');
  }
  return result;
}

export function contractDigest(contract) {
  return createHash('sha256').update(canonicalJson(contract)).digest('hex');
}

export function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }

export function writeBaseline(contract, path) {
  const baseline = { schemaVersion: 1, sha256: contractDigest(contract) };
  // Deliberate explicit command. Never updated as a side effect of a check.
  writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

export function assertNoDrift(contract, baseline) {
  if (baseline?.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(baseline?.sha256 ?? '')) {
    throw new Error('Invalid baseline');
  }
  if (contractDigest(contract) !== baseline.sha256) {
    throw new Error('Contract drift detected: review compatibility before explicitly updating the baseline');
  }
}

/** Compile once per contract; never coerce values, insert defaults or remove fields. */
export function createValidator(schema) {
  const ajv = new Ajv({ allErrors: true, strict: true, validateFormats: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return value => {
    if (!validate(value)) {
      // Paths and keywords only: do not echo business payloads or personal data.
      const details = validate.errors.map(e => `${e.instancePath || '/'}: ${e.keyword}`).join('; ');
      throw new Error(`Contract validation failed: ${details}`);
    }
    return value;
  };
}

export const validateEvent = createValidator(readJson(new URL('../schemas/event-envelope.schema.json', import.meta.url)));

/** Body schema validation is the product's responsibility; envelope validation is shared. */
export function validateEventWithPayload(event, payloadSchema) {
  validateEvent(event);
  createValidator(payloadSchema)(event.payload);
  return event;
}

function runJava(jar, args) {
  if (!jar) throw new Error('Set OPENAPI_GENERATOR_JAR to the local pinned generator JAR');
  const result = spawnSync('java', ['-jar', resolve(jar), ...args], {
    encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024, shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`OpenAPI Generator failed (${result.error?.code ?? result.status}); check the specification and Java installation`);
  }
  return result.stdout.trim();
}

function pinnedJar(jar) {
  if (runJava(jar, ['version']) !== GENERATOR_VERSION) {
    throw new Error(`OpenAPI Generator ${GENERATOR_VERSION} required`);
  }
}

export function validateOpenApi(spec, { jar = process.env.OPENAPI_GENERATOR_JAR } = {}) {
  pinnedJar(jar);
  runJava(jar, ['validate', '-i', resolve(spec)]);
}

/** Always run on trusted local developer-owned specifications, never uploaded documents. */
export function generateClient(spec, output, { jar = process.env.OPENAPI_GENERATOR_JAR } = {}) {
  if (resolve(spec) === resolve(output)) throw new Error('Output must be a separate generated directory');
  validateOpenApi(spec, { jar });
  runJava(jar, ['generate', '-i', resolve(spec), '-g', 'typescript-fetch', '-o', resolve(output),
    '--additional-properties', 'hideGenerationTimestamp=true,enumUnknownDefaultCase=true',
  ]);
}
