import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBimQuery, createIfcOpenShellJob, summarizeIfcEntities, executeBim } from '../src/index.mjs';

test('normalizes IFC query', () => {
  const q = normalizeBimQuery({ file: 'model.ifc', operation: 'properties', entity: '2X' });
  assert.equal(q.file, 'model.ifc');
  assert.equal(q.entity, '2X');
});

test('rejects non IFC input', () => {
  assert.throws(() => normalizeBimQuery({ file: 'model.dwg', operation: 'summary' }), /IFC/);
});

test('creates local ifcopenshell job', () => {
  const job = createIfcOpenShellJob({ file: 'model.ifc', operation: 'summary' });
  assert.equal(job.provider, 'ifcopenshell');
  assert.equal(job.execution, 'local-on-demand');
});

test('summarizes IFC entities', () => {
  assert.deepEqual(summarizeIfcEntities([{ type: 'IfcWall' }, { type: 'IfcPipeSegment' }, { type: 'IfcWall' }]), { total: 3, byType: { IfcWall: 2, IfcPipeSegment: 1 } });
});

test('executes BIM through injected adapter', async () => {
  const result = await executeBim({ run: async job => ({ operation: job.operation }) }, { file: 'model.ifc', operation: 'summary' });
  assert.equal(result.operation, 'summary');
});
