import fs from 'node:fs/promises';
import path from 'node:path';

const CONTENT_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webm', 'video/webm'],
  ['.mp4', 'video/mp4'],
  ['.json', 'application/json'],
  ['.html', 'text/html; charset=utf-8'],
  ['.zip', 'application/zip'],
  ['.log', 'text/plain; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function normalizeEndpoint(value) {
  const url = new URL(String(value || ''));
  if (url.protocol !== 'https:') throw new Error('Cloud endpoint must use https');
  return url.toString().replace(/\/$/, '');
}

function safePart(value, label) {
  const text = String(value || '');
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(text)) throw new Error(`${label} is invalid`);
  return text;
}

function artifactName(value) {
  return String(value || 'artifact').replace(/\\/g, '/').split('/').filter(Boolean).pop()?.replace(/[^A-Za-z0-9._-]+/g, '-') || 'artifact';
}

function artifactPath(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length || parts.some(part => part === '.' || part === '..')) throw new Error('artifact relativePath is invalid');
  return parts.map(part => part.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'item').join('/');
}

async function readResponse(response) {
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) return response.json().catch(() => ({}));
  return { text: await response.text().catch(() => '') };
}

export function createCloudMirror({ endpoint, token, fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  const base = normalizeEndpoint(endpoint);
  if (!token || typeof token !== 'string') throw new Error('Cloud agent token is required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  async function request(relative, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 10_000));
    try {
      const response = await fetchImpl(`${base}${relative}`, {
        ...options,
        headers: { authorization: `Bearer ${token}`, ...(options.headers || {}) },
        signal: options.signal || controller.signal,
      });
      if (!response.ok) {
        const body = await readResponse(response);
        throw new Error(`Cloud mirror HTTP ${response.status}: ${body?.error || body?.text || response.statusText}`);
      }
      return readResponse(response);
    } finally {
      clearTimeout(timer);
    }
  }

  async function postJson(relative, payload) {
    return request(relative, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  }

  async function uploadArtifact(payload) {
    const jobId = safePart(payload?.jobId, 'jobId');
    const projectId = safePart(payload?.projectId, 'projectId');
    const localPath = path.resolve(String(payload?.localPath || ''));
    const name = artifactName(payload?.name || path.basename(localPath));
    const relativePath = payload?.relativePath ? artifactPath(payload.relativePath) : name;
    const body = await fs.readFile(localPath);
    const contentType = CONTENT_TYPES.get(path.extname(name).toLowerCase()) || 'application/octet-stream';
    const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
    return request(`/api/v1/artifacts/${encodeURIComponent(jobId)}/${encodedPath}`, {
      method: 'PUT',
      headers: {
        'content-type': contentType,
        'content-length': String(body.length),
        'x-project-id': projectId,
        'x-artifact-type': String(payload?.type || 'file'),
        'x-artifact-name': name,
      },
      body,
    });
  }

  async function publish(message = {}) {
    const type = String(message.type || '');
    if (type === 'heartbeat') return postJson('/api/v1/heartbeat', message.payload || {});
    if (type === 'job') return postJson('/api/v1/jobs/upsert', message.payload || {});
    if (type === 'event') return postJson('/api/v1/events', message.payload || {});
    if (type === 'artifact') return uploadArtifact(message.payload || {});
    throw new Error(`Unknown cloud mirror message type: ${type}`);
  }

  async function health() {
    const response = await fetchImpl(`${base}/health`, { signal: AbortSignal.timeout(Math.max(1000, Number(timeoutMs) || 10_000)) });
    const body = await readResponse(response);
    return { ok: response.ok && body?.ok === true, status: response.status, body };
  }

  return { endpoint: base, publish, health };
}
