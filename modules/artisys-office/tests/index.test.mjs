import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfficeDocument, renderDocx, toUniverWorkbook, createPptMasterRequest } from '../src/index.mjs';

test('creates portable office document descriptors', () => {
  assert.deepEqual(createOfficeDocument({ kind: 'docx', source: 'contract.docx', title: 'Contrato' }), { kind: 'docx', source: 'contract.docx', title: 'Contrato', metadata: {} });
  assert.throws(() => createOfficeDocument({ kind: 'exe', source: 'x' }), /kind/);
});

test('calls docxjs renderAsync boundary', async () => {
  let received;
  const runtime = { renderAsync: async (...args) => { received = args; return 'rendered'; } };
  assert.equal(await renderDocx(runtime, 'buffer', 'body', 'styles', { inWrapper: false }), 'rendered');
  assert.deepEqual(received, ['buffer', 'body', 'styles', { inWrapper: false }]);
});

test('creates a minimal Univer workbook snapshot', () => {
  const workbook = toUniverWorkbook({ id: 'book-1', name: 'DRE', sheets: [{ id: 'sheet-1', name: 'Resumo', rows: [[1, 2], [3, 4]] }] });
  assert.equal(workbook.id, 'book-1');
  assert.deepEqual(workbook.sheetOrder, ['sheet-1']);
  assert.equal(workbook.sheets['sheet-1'].cellData[1][1].v, 4);
});

test('creates portable PPT Master request without executing a service', () => {
  assert.deepEqual(createPptMasterRequest({ source: 'report.md', output: 'report.pptx', theme: 'corporate' }), { tool: 'ppt-master', source: 'report.md', output: 'report.pptx', theme: 'corporate' });
});
