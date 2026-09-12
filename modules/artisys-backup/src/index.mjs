import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(Buffer.isBuffer(value) ? value : Buffer.from(String(value))).digest('hex');

export function createBackupManifest(files, options = {}) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new TypeError('files must be an object');
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => ({ path, sha256: hash(content), bytes: Buffer.byteLength(Buffer.isBuffer(content) ? content : Buffer.from(String(content))) }));
  return { version: 1, createdAt: new Date(options.createdAt ?? Date.now()).toISOString(), entries };
}

export function verifyBackupManifest(files, manifest) {
  try {
    const expected = createBackupManifest(files, { createdAt: manifest.createdAt });
    const ok = JSON.stringify(expected.entries) === JSON.stringify(manifest.entries);
    return { valid: ok, reason: ok ? 'ok' : 'integrity-mismatch' };
  } catch (error) {
    return { valid: false, reason: 'invalid-input', error };
  }
}
