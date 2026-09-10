import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaptureRequest, normalizeCodeResult, scanQrFile, opencvGrayscale, opencvThreshold } from '../src/index.mjs';

test('creates a validated portable capture request', () => {
  assert.deepEqual(createCaptureRequest({ source: 'camera', mode: 'qr' }), { source: 'camera', mode: 'qr', options: {} });
  assert.throws(() => createCaptureRequest({ source: 'network', mode: 'qr' }), /source/);
});

test('normalizes html5-qrcode style results', () => {
  assert.deepEqual(normalizeCodeResult({ decodedText: 'ABC-123', result: { format: { formatName: 'QR_CODE' } } }), { text: 'ABC-123', format: 'QR_CODE' });
});

test('scans a file through an html5-qrcode scanner instance', async () => {
  const calls = [];
  const scanner = { scanFile: async (...args) => { calls.push(args); return 'VALUE'; } };
  assert.equal(await scanQrFile(scanner, 'code.png'), 'VALUE');
  assert.deepEqual(calls, [['code.png', false]]);
});

test('applies OpenCV grayscale and threshold with caller-owned Mats', () => {
  const calls = [];
  class Mat {}
  const cv = { Mat, COLOR_RGBA2GRAY: 7, THRESH_BINARY: 9, cvtColor: (...args) => calls.push(['gray', ...args]), threshold: (...args) => calls.push(['threshold', ...args]) };
  const src = new Mat();
  const gray = opencvGrayscale(cv, src);
  const binary = opencvThreshold(cv, gray, 120, 255);
  assert.ok(gray instanceof Mat);
  assert.ok(binary instanceof Mat);
  assert.equal(calls[0][0], 'gray');
  assert.equal(calls[1][0], 'threshold');
});
