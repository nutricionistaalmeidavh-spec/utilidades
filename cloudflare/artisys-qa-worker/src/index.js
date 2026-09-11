const TERMINAL = new Set(['PASSED', 'FAILED', 'EXPIRED', 'CANCELLED', 'STALLED', 'PENDING_UPLOAD', 'INTERRUPTED']);
const SAFE_ID = /^[A-Za-z0-9._-]{1,160}$/;

function secureHeaders(extra = {}) {
  return {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...extra,
  };
}

function json(value, status = 200, extraHeaders = {}) {
  const body = JSON.stringify(value);
  return new Response(body, {
    status,
    headers: secureHeaders({
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    }),
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: secureHeaders({
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; media-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'",
    }),
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

function clampText(value, max = 12000) {
  if (value == null) return null;
  return String(value).slice(0, max);
}

async function requestJson(request, maxBytes = 256 * 1024) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new Error('Payload too large');
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('Payload too large');
  return text ? JSON.parse(text) : {};
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureMachine(env, machineId, payload = {}) {
  const now = payload.at || payload.updatedAt || nowIso();
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
    now,
    now,
    JSON.stringify(payload),
  ).run();
}

async function upsertJob(env, event) {
  const jobId = safeId(event.jobId, 'jobId');
  const machineId = safeId(event.machineId, 'machineId');
  const projectId = safeId(event.projectId, 'projectId');
  const stage = clampText(event.stage || 'QUEUED', 64);
  const updatedAt = event.at || event.updatedAt || nowIso();
  const status = TERMINAL.has(stage) ? stage.toLowerCase() : 'running';
  const progressCurrent = event.progress && Number.isFinite(Number(event.progress.current)) ? Number(event.progress.current) : null;
  const progressTotal = event.progress && Number.isFinite(Number(event.progress.total)) ? Number(event.progress.total) : null;

  await ensureMachine(env, machineId, { version: event.version || null, status: 'online', at: updatedAt });
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
    event.action || null,
    stage,
    status,
    clampText(event.detail, 4000),
    progressCurrent,
    progressTotal,
    event.startedAt || updatedAt,
    updatedAt,
    event.finishedAt || (TERMINAL.has(stage) ? updatedAt : null),
    JSON.stringify(event),
  ).run();

  await env.DB.prepare(`
    INSERT INTO events (job_id, machine_id, project_id, stage, detail, created_at, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    jobId,
    machineId,
    projectId,
    stage,
    clampText(event.detail, 4000),
    updatedAt,
    JSON.stringify(event),
  ).run();
}

async function listArtifacts(env, jobId, origin, prefix = '/api/v1/artifacts/') {
  const rows = await env.DB.prepare(`
    SELECT id, job_id, project_id, type, name, size, content_type, created_at
    FROM artifacts WHERE job_id = ? ORDER BY created_at ASC
  `).bind(jobId).all();
  return (rows.results || []).map(item => ({
    ...item,
    url: `${origin}${prefix}${encodeURIComponent(item.id)}`,
  }));
}

async function streamArtifact(env, artifactId, request) {
  const artifact = await env.DB.prepare('SELECT * FROM artifacts WHERE id = ?').bind(artifactId).first();
  if (!artifact) return json({ error: 'Artifact not found' }, 404);
  const object = await env.R2.get(artifact.object_key, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (!object) return json({ error: 'R2 object not found' }, 404);
  const headers = new Headers(secureHeaders());
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('content-type', artifact.content_type || headers.get('content-type') || 'application/octet-stream');
  const requestedRange = request.headers.has('range');
  if (object.range && typeof object.range.offset === 'number' && typeof object.range.length === 'number') {
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
    headers.set('content-length', String(object.range.length));
  } else if (object.size != null) {
    headers.set('content-length', String(object.size));
  }
  return new Response('body' in object ? object.body : undefined, {
    status: 'body' in object ? (requestedRange ? 206 : 200) : 412,
    headers,
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function validShare(env, token) {
  const tokenHash = await sha256(token);
  const share = await env.DB.prepare('SELECT job_id, expires_at FROM shares WHERE token_hash = ?').bind(tokenHash).first();
  if (!share) return null;
  if (Date.parse(share.expires_at) <= Date.now()) return null;
  return share;
}

async function sharedJobPayload(env, jobId, origin, token) {
  const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
  if (!job) return null;
  const events = await env.DB.prepare(`
    SELECT id, stage, detail, created_at FROM events WHERE job_id = ? ORDER BY created_at ASC LIMIT 1000
  `).bind(jobId).all();
  const artifacts = await listArtifacts(env, jobId, origin, `/share/${encodeURIComponent(token)}/artifacts/`);
  return { job, events: events.results || [], artifacts };
}

function dashboardHtml() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ArtiSys QA Cloud</title><style>
  :root{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark;background:#0d1117;color:#f0f6fc}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1000px;margin:auto;padding:16px}.card{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:16px;margin:12px 0}.row{display:flex;gap:8px;flex-wrap:wrap}input,button{min-height:44px;border-radius:10px;border:1px solid #30363d;background:#0d1117;color:#f0f6fc;padding:10px 12px;font:inherit}input{flex:1;min-width:180px}button{background:#238636;font-weight:700}.stage{font-size:28px;font-weight:800}.muted{color:#8b949e}.bad{color:#f85149}.ok{color:#3fb950}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.event{border-left:3px solid #30363d;padding:7px 10px;margin:6px 0}.artifact{border:1px solid #30363d;border-radius:10px;padding:10px;margin:8px 0}@media(max-width:720px){.grid{grid-template-columns:1fr}.stage{font-size:22px}}</style></head><body><main class="wrap">
  <h1 style="margin-bottom:4px">ArtiSys QA Cloud</h1><div class="muted">D1 + R2 · somente leitura</div>
  <section class="card"><div class="row"><input id="token" type="password" placeholder="Token de leitura"><button id="connect">Conectar</button></div><div id="connection" class="muted" style="margin-top:8px">desconectado</div></section>
  <div class="grid"><div><section class="card"><div class="muted">Job atual</div><div id="stage" class="stage">IDLE</div><div id="detail" class="muted"></div><div id="progress" class="mono"></div><button id="share" style="margin-top:10px;display:none">Gerar link temporário</button><div id="shareUrl" class="mono muted" style="margin-top:8px"></div></section><section class="card"><strong>Eventos</strong><div id="events" class="muted"></div></section></div><div><section class="card"><strong>Máquinas</strong><div id="machines" class="mono muted"></div></section><section class="card"><strong>Artefatos</strong><div id="artifacts" class="muted"></div></section></div></div>
  <section class="card"><strong>Histórico</strong><div id="history" class="mono muted"></div></section>
</main><script>
+const $=id=>document.getElementById(id);let token='',timer=null,currentJob=null;
+async function api(path,options={}){const r=await fetch(path,{...options,headers:{...(options.headers||{}),authorization:'Bearer '+token}});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
+async function refresh(){try{const [machines,current,history]=await Promise.all([api('/api/v1/machines'),api('/api/v1/jobs/current'),api('/api/v1/history')]);$('connection').textContent='online';$('connection').className='ok';$('machines').textContent=machines.map(m=>m.id+' · '+m.version+' · '+m.status+' · '+m.last_seen_at).join('\n')||'—';$('history').textContent=history.map(j=>j.id+' · '+j.stage+' · '+j.updated_at).join('\n')||'—';const job=current.job;currentJob=job?.id||null;$('stage').textContent=job?.stage||'IDLE';$('detail').textContent=job?.detail||'Nenhum job ativo';$('progress').textContent=job&&job.progress_total!=null?(job.progress_current||0)+'/'+job.progress_total:'';$('share').style.display=currentJob?'inline-block':'none';if(currentJob){const [events,arts]=await Promise.all([api('/api/v1/jobs/'+encodeURIComponent(currentJob)+'/events'),api('/api/v1/jobs/'+encodeURIComponent(currentJob)+'/artifacts')]);$('events').innerHTML='';for(const e of events.slice(-60)){const d=document.createElement('div');d.className='event';d.textContent=e.created_at+' · '+(e.stage||'')+(e.detail?' · '+e.detail:'');$('events').appendChild(d)}$('artifacts').innerHTML='';for(const a of arts){const d=document.createElement('div');d.className='artifact';d.textContent=(a.type||'file')+' · '+a.name+' ';const b=document.createElement('button');b.textContent='Abrir';b.onclick=async()=>{const r=await fetch('/api/v1/artifacts/'+encodeURIComponent(a.id),{headers:{authorization:'Bearer '+token}});if(!r.ok)return alert('HTTP '+r.status);window.open(URL.createObjectURL(await r.blob()),'_blank','noopener')};d.appendChild(b);$('artifacts').appendChild(d)}}else{$('events').textContent='';$('artifacts').textContent='';}}catch(e){$('connection').textContent=e.message;$('connection').className='bad'}finally{timer=setTimeout(refresh,2000)}}
+$('connect').onclick=()=>{token=$('token').value.trim();sessionStorage.setItem('qaReadToken',token);if(timer)clearTimeout(timer);refresh()};$('share').onclick=async()=>{if(!currentJob)return;try{const out=await api('/api/v1/jobs/'+encodeURIComponent(currentJob)+'/share',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ttlSeconds:1800})});$('shareUrl').textContent=out.url}catch(e){$('shareUrl').textContent=e.message}};const saved=sessionStorage.getItem('qaReadToken');if(saved){$('token').value=saved;token=saved;refresh()}
+</script></body></html>`;
}

async function handleAgentWrite(request, env, url) {
  if (!authorized(request, env.ARTISYS_QA_AGENT_TOKEN)) return json({ error: 'Unauthorized' }, 401);

  if (request.method === 'POST' && url.pathname === '/api/v1/heartbeat') {
    const body = await requestJson(request);
    const machineId = safeId(body.machineId, 'machineId');
    await ensureMachine(env, machineId, body);
    return json({ ok: true, at: nowIso() });
  }

  const eventMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})\/events$/);
  if (request.method === 'POST' && eventMatch) {
    const body = await requestJson(request);
    const jobId = safeId(eventMatch[1], 'jobId');
    if (body.jobId && body.jobId !== jobId) return json({ error: 'jobId mismatch' }, 400);
    await upsertJob(env, { ...body, jobId });
    return json({ ok: true, jobId });
  }

  const artifactMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})\/artifacts$/);
  if (request.method === 'POST' && artifactMatch) {
    const jobId = safeId(artifactMatch[1], 'jobId');
    const machineId = safeId(url.searchParams.get('machineId'), 'machineId');
    const projectId = safeId(url.searchParams.get('projectId'), 'projectId');
    const type = clampText(url.searchParams.get('type') || 'file', 64);
    const originalName = safeName(url.searchParams.get('name') || 'artifact');
    const createdAt = url.searchParams.get('createdAt') || nowIso();
    const job = await env.DB.prepare('SELECT id FROM jobs WHERE id = ?').bind(jobId).first();
    if (!job) return json({ error: 'Unknown job; send job event before artifacts' }, 409);
    await ensureMachine(env, machineId, { status: 'online', at: createdAt });
    const artifactId = crypto.randomUUID();
    const key = `${projectId}/${jobId}/${artifactId}-${originalName}`;
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const object = await env.R2.put(key, request.body, {
      httpMetadata: { contentType },
      customMetadata: { jobId, machineId, projectId, type, originalName },
    });
    await env.DB.prepare(`
      INSERT INTO artifacts (id, job_id, machine_id, project_id, type, name, object_key, size, content_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      artifactId,
      jobId,
      machineId,
      projectId,
      type,
      originalName,
      key,
      object.size || Number(request.headers.get('content-length') || 0) || null,
      contentType,
      createdAt,
    ).run();
    return json({ ok: true, id: artifactId, key, size: object.size || null }, 201);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleReader(request, env, url) {
  if (!authorized(request, env.ARTISYS_QA_READ_TOKEN)) return json({ error: 'Unauthorized' }, 401);

  if (request.method === 'GET' && url.pathname === '/api/v1/machines') {
    const out = await env.DB.prepare(`SELECT id, name, version, status, last_seen_at FROM machines ORDER BY last_seen_at DESC LIMIT 100`).all();
    return json(out.results || []);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/jobs/current') {
    const machineId = url.searchParams.get('machineId');
    const job = machineId
      ? await env.DB.prepare(`SELECT * FROM jobs WHERE machine_id = ? ORDER BY updated_at DESC LIMIT 1`).bind(safeId(machineId, 'machineId')).first()
      : await env.DB.prepare(`SELECT * FROM jobs ORDER BY updated_at DESC LIMIT 1`).first();
    return json({ job: job || null });
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/history') {
    const out = await env.DB.prepare(`SELECT * FROM jobs ORDER BY updated_at DESC LIMIT 100`).all();
    return json(out.results || []);
  }

  const jobMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})(?:\/(events|artifacts|share))?$/);
  if (jobMatch) {
    const jobId = safeId(jobMatch[1], 'jobId');
    const suffix = jobMatch[2] || null;
    if (request.method === 'GET' && !suffix) {
      const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
      return job ? json(job) : json({ error: 'Not found' }, 404);
    }
    if (request.method === 'GET' && suffix === 'events') {
      const out = await env.DB.prepare(`SELECT id, stage, detail, created_at, payload_json FROM events WHERE job_id = ? ORDER BY created_at ASC LIMIT 1000`).bind(jobId).all();
      return json(out.results || []);
    }
    if (request.method === 'GET' && suffix === 'artifacts') {
      return json(await listArtifacts(env, jobId, url.origin));
    }
    if (request.method === 'POST' && suffix === 'share') {
      const body = await requestJson(request, 16 * 1024);
      const ttlSeconds = Math.max(60, Math.min(3600, Number(body.ttlSeconds || 1800)));
      const job = await env.DB.prepare('SELECT id FROM jobs WHERE id = ?').bind(jobId).first();
      if (!job) return json({ error: 'Not found' }, 404);
      const token = randomToken();
      const tokenHash = await sha256(token);
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      await env.DB.prepare(`INSERT INTO shares (token_hash, job_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).bind(tokenHash, jobId, expiresAt, createdAt).run();
      return json({ url: `${url.origin}/share/${token}`, expiresAt });
    }
  }

  const artifactMatch = url.pathname.match(/^\/api\/v1\/artifacts\/([A-Za-z0-9-]{1,80})$/);
  if (request.method === 'GET' && artifactMatch) return streamArtifact(env, artifactMatch[1], request);

  return json({ error: 'Not found' }, 404);
}

async function handleShare(request, env, url) {
  const match = url.pathname.match(/^\/share\/([A-Za-z0-9_-]{20,120})(?:\/artifacts\/([A-Za-z0-9-]{1,80}))?$/);
  if (!match || request.method !== 'GET') return json({ error: 'Not found' }, 404);
  const token = match[1];
  const share = await validShare(env, token);
  if (!share) return json({ error: 'Share expired or invalid' }, 410);
  if (match[2]) {
    const artifact = await env.DB.prepare('SELECT job_id FROM artifacts WHERE id = ?').bind(match[2]).first();
    if (!artifact || artifact.job_id !== share.job_id) return json({ error: 'Artifact not found' }, 404);
    return streamArtifact(env, match[2], request);
  }
  const payload = await sharedJobPayload(env, share.job_id, url.origin, token);
  return payload ? json(payload) : json({ error: 'Job not found' }, 404);
}

export default {
  async fetch(request, env) {
    try {
      requireBindings(env);
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/') return html(dashboardHtml());
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, bindings: { DB: Boolean(env.DB), R2: Boolean(env.R2) } });
      }
      if (url.pathname.startsWith('/share/')) return handleShare(request, env, url);
      if (url.pathname === '/api/v1/heartbeat' || /^\/api\/v1\/jobs\/[A-Za-z0-9._-]{1,160}\/(events|artifacts)$/.test(url.pathname)) {
        return handleAgentWrite(request, env, url);
      }
      if (url.pathname.startsWith('/api/v1/')) return handleReader(request, env, url);
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      const message = error?.message || 'Internal error';
      const status = /Invalid |Payload too large|mismatch/.test(message) ? 400 : 500;
      return json({ error: message }, status);
    }
  },
};
