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

export function selectBackupRetention(backups, options = {}) {
  if (!Array.isArray(backups)) throw new TypeError('backups must be an array');
  const keepLast = options.keepLast ?? 7;
  if (!Number.isInteger(keepLast) || keepLast < 1) throw new RangeError('keepLast must be >= 1');
  const sorted = backups.map((item) => {
    if (!item?.id) throw new TypeError('backup id is required');
    const createdAt = new Date(item.createdAt);
    if (!Number.isFinite(createdAt.getTime())) throw new TypeError('backup createdAt is invalid');
    return { ...item, createdAt: createdAt.toISOString() };
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || String(a.id).localeCompare(String(b.id)));
  return { keep: sorted.slice(0, keepLast), prune: sorted.slice(keepLast) };
}

export function isBackupDue({ lastBackupAt = null, now = Date.now(), intervalMs } = {}) {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new RangeError('intervalMs must be positive');
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new TypeError('now is invalid');
  if (lastBackupAt == null) return true;
  const lastMs = new Date(lastBackupAt).getTime();
  if (!Number.isFinite(lastMs)) throw new TypeError('lastBackupAt is invalid');
  return nowMs - lastMs >= intervalMs;
}
