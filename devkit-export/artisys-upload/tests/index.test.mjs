import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUploadPolicy,
  normalizeUploadFile,
  validateUploadBatch,
  createUploadQueue,
  createUppyConfig,
  toDropzoneOptions,
} from '../src/index.mjs';

test('validates upload policy and preserves accepted types', () => {
  const policy = validateUploadPolicy({ maxFiles: 3, maxFileSize: 5_000_000, accept: ['image/*', 'application/pdf'] });
  assert.equal(policy.maxFiles, 3);
  assert.deepEqual(policy.accept, ['image/*', 'application/pdf']);
});

test('normalizes file metadata', () => {
  assert.deepEqual(normalizeUploadFile({ name: 'foto.jpg', size: 10, type: 'image/jpeg', lastModified: 123 }), {
    name: 'foto.jpg', size: 10, type: 'image/jpeg', lastModified: 123,
  });
});

test('rejects oversized and disallowed files in a batch', () => {
  const policy = { maxFiles: 2, maxFileSize: 100, accept: ['image/*'] };
  const result = validateUploadBatch([
    { name: 'ok.jpg', size: 50, type: 'image/jpeg' },
    { name: 'bad.pdf', size: 200, type: 'application/pdf' },
  ], policy);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.rejected[0].reasons.sort(), ['file-too-large', 'type-not-allowed']);
});

test('creates a portable queue with deterministic ids', () => {
  const queue = createUploadQueue([{ name: 'a.pdf', size: 10, type: 'application/pdf' }], { idFactory: () => 'file-1' });
  assert.deepEqual(queue, [{ id: 'file-1', name: 'a.pdf', size: 10, type: 'application/pdf', lastModified: null, status: 'queued', progress: 0 }]);
});

test('creates Uppy restrictions without requiring remote services', () => {
  const config = createUppyConfig({ maxFiles: 3, maxFileSize: 2000, accept: ['application/pdf'] });
  assert.deepEqual(config.restrictions, { maxNumberOfFiles: 3, maxFileSize: 2000, allowedFileTypes: ['application/pdf'] });
  assert.equal('companionUrl' in config, false);
});

test('creates react-dropzone options', () => {
  const options = toDropzoneOptions({ maxFiles: 2, maxFileSize: 1000, accept: ['image/*'] });
  assert.deepEqual(options, { maxFiles: 2, maxSize: 1000, accept: { 'image/*': [] }, multiple: true });
});
