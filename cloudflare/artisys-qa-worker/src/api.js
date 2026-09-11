const TERMINAL = new Set(['PASSED', 'FAILED', 'EXPIRED', 'CANCELLED', 'STALLED', 'PENDING_UPLOAD', 'INTERRUPTED']);
const SAFE_ID = /^[A-Za-z0-9._-]{1,160}$/;

function headers(extra = {}) {
  return {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...extra,
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: headers({ 'content-type': 'application/json; charset=utf-8' }),
  });
}

function bearer(request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

function authorized(request, secret) {
  const actual = bearer(request);
  return Boolean(secret && actual && actual.length === String(secret).length && actual === String(secret));
}

function requireBindings(env) {
  if (!env.DB) throw new Error('Missing D1 binding env.DB');
  if (!env.R2) throw new Error('Missing R2 binding env.R2');
}

function safeId(value, label = 'id') {
  const text = String(value || '');
  if (!SAFE_ID.test(text)) throw new Error(`Invalid ${label}`);
  return text;
}

function safeName(value) {
  return String(value || 'artifact')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'artifact';
}

function text(value, max = 12000) {
  return value == null ? null : String(value).slice(0, max);
}

function nowIso() {
  return new Date().toISOString();
}

async function readJson(request, maxBytes = 256 * 1024) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('Payload too large');
  const raw = await request.text();
  if (raw.length > maxBytes) throw new Error('Payload too large');
  return raw ? JSON.parse(raw) : {};
}

async function ensureMachine(env, machineId, payload = {}) {
  const at = payload.at || payload.updatedAt || nowIso();
  await env.DB.prepare(`
    INSERT INTO machines (id, name, version, status, last_seen_at, created_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = COALESCE(excluded.name, machines.name),
      version = COALESCE(excluded.version, machines.version),
      status = excluded.status,
      last_seen_at = excluded.last_seen_at,
      payload_json = excluded.payload_json
  `).bind(
    machineId,
    payload.name || machineId,
    payload.version || null,
    payload.status || 'online',
    at,
    at,
    JSON.stringify(payload),
  ).run();
}

async function ensureJob(env, { jobId, machineId, projectId, at = nowIso() }) {
  await ensureMachine(env, machineId, { status: 'online', at });
  await env.DB.prepare(`
    INSERT INTO jobs (id, machine_id, project_id, action, stage, status, detail, started_at, updated_at, payload_json)
    VALUES (?, ?, ?, NULL, 'QUEUED', 'running', 'Artifact arrived before telemetry event', ?, ?, '{}')
    ON CONFLICT(id) DO NOTHING
  `).bind(jobId, machineId, projectId, at, at).run();
}

async function recordEvent(env, input) {
  const jobId = safeId(input.jobId, 'jobId');
  const machineId = safeId(input.machineId, 'machineId');
  const projectId = safeId(input.projectId, 'projectId');
  const stage = text(input.stage || 'QUEUED', 64);
  const at = input.at || input.updatedAt || nowIso();
  const terminal = TERMINAL.has(stage);
  const progressCurrent = input.progress && Number.isFinite(Number(input.progress.current)) ? Number(input.progress.current) : null;
  const progressTotal = input.progress && Number.isFinite(Number(input.progress.total)) ? Number(input.progress.total) : null;

  await ensureMachine(env, machineId, { version: input.version || null, status: 'online', at });
  await env.DB.prepare(`
    INSERT INTO jobs (
      id, machine_id, project_id, action, stage, status, detail,
      progress_current, progress_total, started_at, updated_at, finished_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      machine_id = excluded.machine_id,
      project_id = excluded.project_id,
      action = COALESCE(excluded.action, jobs.action),
      stage = excluded.stage,
      status = excluded.status,
      detail = excluded.detail,
      progress_current = excluded.progress_current,
      progress_total = excluded.progress_total,
      started_at = COALESCE(jobs.started_at, excluded.started_at),
      updated_at = excluded.updated_at,
      finished_at = excluded.finished_at,
      payload_json = excluded.payload_json
    WHERE excluded.updated_at >= jobs.updated_at
  `).bind(
    jobId,
    machineId,
    projectId,
    input.action || null,
    stage,
    terminal ? stage.toLowerCase() : 'running',
    text(input.detail, 4000),
    progressCurrent,
    progressTotal,
    input.startedAt || at,
    at,
    input.finishedAt || (terminal ? at : null),
    JSON.stringify(input),
  ).run();

  await env.DB.prepare(`
    INSERT INTO events (job_id, machine_id, project_id, stage, detail, created_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(jobId, machineId, projectId, stage, text(input.detail, 4000), at, JSON.stringify(input)).run();
}

async function artifactRows(env, jobId, origin, prefix = '/api/v1/artifacts/') {
  const out = await env.DB.prepare(`
    SELECT id, job_id, project_id, type, name, size, content_type, created_at
    FROM artifacts WHERE job_id = ? ORDER BY created_at ASC
  `).bind(jobId).all();
  return (out.results || []).map(row => ({ ...row, url: `${origin}${prefix}${encodeURIComponent(row.id)}` }));
}

async function artifactResponse(env, artifactId, request) {
  const row = await env.DB.prepare('SELECT * FROM artifacts WHERE id = ?').bind(artifactId).first();
  if (!row) return json({ error: 'Artifact not found' }, 404);
  const object = await env.R2.get(row.object_key, { onlyIf: request.headers, range: request.headers });
  if (!object) return json({ error: 'R2 object not found' }, 404);
  const responseHeaders = new Headers(headers());
  object.writeHttpMetadata(responseHeaders);
  responseHeaders.set('etag', object.httpEtag);
  responseHeaders.set('accept-ranges', 'bytes');
  responseHeaders.set('content-type', row.content_type || responseHeaders.get('content-type') || 'application/octet-stream');
  const ranged = request.headers.has('range');
  if (object.range && typeof object.range.offset === 'number' && typeof object.range.length === 'number') {
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    responseHeaders.set('content-range', `bytes ${start}-${end}/${object.size}`);
    responseHeaders.set('content-length', String(object.range.length));
  } else if (object.size != null) {
    responseHeaders.set('content-length', String(object.size));
  }
  return new Response('body' in object ? object.body : undefined, {
    status: 'body' in object ? (ranged ? 206 : 200) : 412,
    headers: responseHeaders,
  });
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getShare(env, token) {
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT job_id, expires_at FROM shares WHERE token_hash = ?').bind(hash).first();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return row;
}

async function agentApi(request, env, url) {
  if (!authorized(request, env.ARTISYS_QA_AGENT_TOKEN)) return json({ error: 'Unauthorized' }, 401);

  if (request.method === 'POST' && url.pathname === '/api/v1/heartbeat') {
    const body = await readJson(request);
    const machineId = safeId(body.machineId, 'machineId');
    await ensureMachine(env, machineId, body);
    return json({ ok: true, at: nowIso() });
  }

  const eventMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})\/events$/);
  if (request.method === 'POST' && eventMatch) {
    const body = await readJson(request);
    const jobId = safeId(eventMatch[1], 'jobId');
    if (body.jobId && body.jobId !== jobId) return json({ error: 'jobId mismatch' }, 400);
    await recordEvent(env, { ...body, jobId });
    return json({ ok: true, jobId });
  }

  const artifactMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})\/artifacts$/);
  if (request.method === 'POST' && artifactMatch) {
    const jobId = safeId(artifactMatch[1], 'jobId');
    const machineId = safeId(url.searchParams.get('machineId'), 'machineId');
    const projectId = safeId(url.searchParams.get('projectId'), 'projectId');
    const type = text(url.searchParams.get('type') || 'file', 64);
    const name = safeName(url.searchParams.get('name') || 'artifact');
    const createdAt = url.searchParams.get('createdAt') || nowIso();
    await ensureJob(env, { jobId, machineId, projectId, at: createdAt });
    const id = crypto.randomUUID();
    const key = `${projectId}/${jobId}/${id}-${name}`;
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const object = await env.R2.put(key, request.body, {
      httpMetadata: { contentType },
      customMetadata: { jobId, machineId, projectId, type, originalName: name },
    });
    const declaredSize = Number(request.headers.get('content-length') || 0);
    await env.DB.prepare(`
      INSERT INTO artifacts (id, job_id, machine_id, project_id, type, name, object_key, size, content_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, jobId, machineId, projectId, type, name, key, object.size || declaredSize || null, contentType, createdAt).run();
    return json({ ok: true, id, key, size: object.size || declaredSize || null }, 201);
  }

  return json({ error: 'Not found' }, 404);
}

async function readerApi(request, env, url) {
  if (!authorized(request, env.ARTISYS_QA_READ_TOKEN)) return json({ error: 'Unauthorized' }, 401);

  if (request.method === 'GET' && url.pathname === '/api/v1/machines') {
    const out = await env.DB.prepare('SELECT id, name, version, status, last_seen_at FROM machines ORDER BY last_seen_at DESC LIMIT 100').all();
    return json(out.results || []);
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/jobs/current') {
    const machineId = url.searchParams.get('machineId');
    const row = machineId
      ? await env.DB.prepare('SELECT * FROM jobs WHERE machine_id = ? ORDER BY updated_at DESC LIMIT 1').bind(safeId(machineId, 'machineId')).first()
      : await env.DB.prepare('SELECT * FROM jobs ORDER BY updated_at DESC LIMIT 1').first();
    return json({ job: row || null });
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/history') {
    const out = await env.DB.prepare('SELECT * FROM jobs ORDER BY updated_at DESC LIMIT 100').all();
    return json(out.results || []);
  }

  const jobMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})(?:\/(events|artifacts|share))?$/);
  if (jobMatch) {
    const jobId = safeId(jobMatch[1], 'jobId');
    const suffix = jobMatch[2] || null;
    if (request.method === 'GET' && !suffix) {
      const row = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
      return row ? json(row) : json({ error: 'Not found' }, 404);
    }
    if (request.method === 'GET' && suffix === 'events') {
      const out = await env.DB.prepare('SELECT id, stage, detail, created_at, payload_json FROM events WHERE job_id = ? ORDER BY created_at ASC LIMIT 1000').bind(jobId).all();
      return json(out.results || []);
    }
    if (request.method === 'GET' && suffix === 'artifacts') {
      return json(await artifactRows(env, jobId, url.origin));
    }
    if (request.method === 'POST' && suffix === 'share') {
      const body = await readJson(request, 16 * 1024);
      const job = await env.DB.prepare('SELECT id FROM jobs WHERE id = ?').bind(jobId).first();
      if (!job) return json({ error: 'Not found' }, 404);
      const ttl = Math.max(60, Math.min(3600, Number(body.ttlSeconds || 1800)));
      const token = randomToken();
      const hash = await sha256(token);
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      await env.DB.prepare('INSERT INTO shares (token_hash, job_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(hash, jobId, expiresAt, createdAt).run();
      return json({ url: `${url.origin}/share/${token}`, expiresAt });
    }
  }

  const artifactMatch = url.pathname.match(/^\/api\/v1\/artifacts\/([A-Za-z0-9-]{1,80})$/);
  if (request.method === 'GET' && artifactMatch) return artifactResponse(env, artifactMatch[1], request);
  return json({ error: 'Not found' }, 404);
}

async function shareApi(request, env, url) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const match = url.pathname.match(/^\/share\/([A-Za-z0-9_-]{20,120})(?:\/artifacts\/([A-Za-z0-9-]{1,80}))?$/);
  if (!match) return json({ error: 'Not found' }, 404);
  const token = match[1];
  const share = await getShare(env, token);
  if (!share) return json({ error: 'Share expired or invalid' }, 410);
  if (match[2]) {
    const artifact = await env.DB.prepare('SELECT job_id FROM artifacts WHERE id = ?').bind(match[2]).first();
    if (!artifact || artifact.job_id !== share.job_id) return json({ error: 'Artifact not found' }, 404);
    return artifactResponse(env, match[2], request);
  }
  const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(share.job_id).first();
  if (!job) return json({ error: 'Job not found' }, 404);
  const events = await env.DB.prepare('SELECT id, stage, detail, created_at FROM events WHERE job_id = ? ORDER BY created_at ASC LIMIT 1000').bind(share.job_id).all();
  const artifacts = await artifactRows(env, share.job_id, url.origin, `/share/${encodeURIComponent(token)}/artifacts/`);
  return json({ job, events: events.results || [], artifacts });
}

export default {
  async fetch(request, env) {
    try {
      requireBindings(env);
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, bindings: { DB: Boolean(env.DB), R2: Boolean(env.R2) } });
      }
      if (url.pathname.startsWith('/share/')) return shareApi(request, env, url);
      if (url.pathname === '/api/v1/heartbeat' || /^\/api\/v1\/jobs\/[A-Za-z0-9._-]{1,160}\/(events|artifacts)$/.test(url.pathname)) {
        return agentApi(request, env, url);
      }
      if (url.pathname.startsWith('/api/v1/')) return readerApi(request, env, url);
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      const message = error?.message || 'Internal error';
      const status = /Invalid |Payload too large|mismatch/.test(message) ? 400 : 500;
      return json({ error: message }, status);
    }
  },
};
