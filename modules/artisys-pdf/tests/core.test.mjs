import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePdfTemplate,
  normalizePdfInputs,
  normalizeHighlight,
  buildPdfmePlugins,
  generatePdf,
  loadPdfDocument,
  toReactPdfHighlight,
  fromReactPdfHighlight,
} from '../src/index.mjs';

test('validatePdfTemplate rejects missing basePdf', () => {
  assert.throws(() => validatePdfTemplate({ schemas: [] }), /basePdf/);
});

test('normalizePdfInputs converts primitive values to pdfme strings', () => {
  assert.deepEqual(normalizePdfInputs([{ name: 'Ana', total: 42, active: true, empty: null }]), [
    { name: 'Ana', total: '42', active: 'true', empty: '' },
  ]);
});

test('normalizeHighlight creates a portable viewport-independent highlight', () => {
  const result = normalizeHighlight({
    id: 'h1',
    pageNumber: 2,
    rect: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.5 },
    text: 'trecho',
    comment: 'revisar',
  });
  assert.deepEqual(result, {
    id: 'h1',
    pageNumber: 2,
    rect: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.5 },
    text: 'trecho',
    comment: 'revisar',
    meta: {},
  });
});

test('buildPdfmePlugins maps supported schemas including qrcode', () => {
  const schemas = {
    text: { kind: 'text' },
    image: { kind: 'image' },
    signature: { kind: 'signature' },
    table: { kind: 'table' },
    barcodes: { qrcode: { kind: 'qrcode' } },
  };
  assert.deepEqual(buildPdfmePlugins(schemas), {
    text: schemas.text,
    image: schemas.image,
    signature: schemas.signature,
    table: schemas.table,
    qrcode: schemas.barcodes.qrcode,
  });
});

test('generatePdf uses injected pdfme generator and returns Uint8Array', async () => {
  let received;
  const bytes = new Uint8Array([1, 2, 3]);
  const generator = async (options) => {
    received = options;
    return bytes;
  };
  const template = { basePdf: { width: 210, height: 297, padding: [0, 0, 0, 0] }, schemas: [[]] };
  const result = await generatePdf({ template, inputs: [{ total: 12 }], plugins: { text: {} }, generator });
  assert.equal(result, bytes);
  assert.deepEqual(received.inputs, [{ total: '12' }]);
});

test('loadPdfDocument resolves injected PDF.js loading task', async () => {
  const doc = { numPages: 3 };
  const pdfjs = { getDocument: (source) => ({ promise: Promise.resolve({ ...doc, source }) }) };
  const result = await loadPdfDocument('invoice.pdf', { pdfjs });
  assert.equal(result.numPages, 3);
  assert.equal(result.source, 'invoice.pdf');
});

test('react-pdf-highlighter adapter converts normalized coordinates roundtrip', () => {
  const portable = normalizeHighlight({ id: 'h2', pageNumber: 3, rect: { x1: 0.1, y1: 0.2, x2: 0.5, y2: 0.4 }, text: 'abc', comment: 'note', meta: { emoji: '!' } });
  const ui = toReactPdfHighlight(portable, { width: 1000, height: 2000 });
  assert.equal(ui.position.boundingRect.x1, 100);
  assert.equal(ui.position.boundingRect.y2, 800);
  assert.equal(ui.position.usePdfCoordinates, true);
  assert.equal(ui.comment.text, 'note');
  const restored = fromReactPdfHighlight(ui);
  assert.deepEqual(restored.rect, portable.rect);
  assert.equal(restored.text, 'abc');
});
