import { validateUploadBatch, createUploadQueue, createUppyConfig, toDropzoneOptions } from '../src/index.mjs';

const policy = { maxFiles: 5, maxFileSize: 10_000_000, accept: ['image/*', 'application/pdf'] };
const files = [
  { name: 'foto-obra.jpg', size: 240_000, type: 'image/jpeg' },
  { name: 'relatorio.pdf', size: 580_000, type: 'application/pdf' },
];

const batch = validateUploadBatch(files, policy);
console.log({
  accepted: batch.accepted,
  queue: createUploadQueue(batch.accepted, { idFactory: (_, index) => `demo-${index + 1}` }),
  uppy: createUppyConfig(policy),
  dropzone: toDropzoneOptions(policy),
});
