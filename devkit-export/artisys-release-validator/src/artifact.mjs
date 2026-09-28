import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function sha256File(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new TypeError('artifact path is required');
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
