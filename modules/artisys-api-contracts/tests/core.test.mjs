import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalJson, contractDigest, assertNoDrift, writeBaseline, createValidator, validateEventWithPayload, generateClient } from '../src/index.mjs';

const sale = { id: 'sale-1', totalCents: 750, status: 'completed' };
const schema = JSON.parse(readFileSync(new URL('../examples/sale.schema.json', import.meta.url)));
test('key order is irrelevant but changed nested contract is drift', () => {
  assert.equal(contractDigest({ a: 1, b: { x: 2, y: 3 } }), contractDigest({ b: { y: 3, x: 2 }, a: 1 }));
  const baseline = { schemaVersion: 1, sha256: contractDigest(schema) };
  assert.doesNotThrow(() => assertNoDrift(schema, baseline));
  const changed = structuredClone(schema); changed.properties.totalCents.type = 'string';
  assert.throws(() => assertNoDrift(changed, baseline), /drift/);
});
test('malformed baseline fails closed', () => assert.throws(() => assertNoDrift(schema, { schemaVersion: 1 }), /Invalid baseline/));
test('baseline check never rewrites approved baseline', () => {
  const dir = mkdtempSync(join(tmpdir(), 'artisys-contract-'));
  try {
    const path = join(dir, 'baseline.json'); writeBaseline(schema, path);
    const before = readFileSync(path, 'utf8');
    assert.throws(() => assertNoDrift({}, JSON.parse(before)), /drift/);
    assert.equal(readFileSync(path, 'utf8'), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('strict schema rejects money string, fraction, missing field, unknown field and negative amount', () => {
  const validate = createValidator(schema);
  assert.deepEqual(validate(sale), sale);
  for (const bad of [{ ...sale, totalCents: '750' }, { ...sale, totalCents: 7.5 }, { ...sale, totalCents: -1 }, { id: 'x' }, { ...sale, secret: 'hidden' }]) {
    assert.throws(() => validate(bad), /Contract validation failed/);
  }
});
test('validation never leaks payload or changes input', () => {
  const value = { ...sale, totalCents: 'PRIVATE-DATA' };
  try { createValidator(schema)(value); assert.fail('should reject'); } catch (error) { assert.doesNotMatch(error.message, /PRIVATE-DATA/); }
  assert.equal(value.totalCents, 'PRIVATE-DATA');
});
test('event envelope and product payload validate independently', () => {
  const event = { id: '4ecc2a43-4d79-4f11-8cc9-eab81342886f', type: 'sale.completed', version: 1, occurredAt: '2026-09-10T12:00:00Z', source: 'terminal-1', correlationId: 'operation-1', payload: sale };
  assert.doesNotThrow(() => validateEventWithPayload(event, schema));
  for (const changed of [{ version: 0 }, { occurredAt: 'yesterday' }, { id: 'not-uuid' }, { payload: { ...sale, totalCents: -1 } }]) {
    assert.throws(() => validateEventWithPayload({ ...event, ...changed }, schema));
  }
});
test('invalid schema does not silently allow unknown validation keywords', () => {
  assert.throws(() => createValidator({ type: 'string', minLenght: 3 }));
});
test('non-JSON values fail canonicalization', () => {
  assert.throws(() => canonicalJson({ x: undefined }));
  assert.throws(() => canonicalJson(Infinity));
});
test('CLI returns nonzero on invalid arguments', () => {
  const result = spawnSync(process.execPath, [new URL('../bin/contracts.mjs', import.meta.url).pathname, 'unknown', 'unused'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
});
test('generator missing JAR is an error, not a skipped success', () => {
  assert.throws(() => generateClient('spec.json', 'out', { jar: '' }), /OPENAPI_GENERATOR_JAR/);
});
