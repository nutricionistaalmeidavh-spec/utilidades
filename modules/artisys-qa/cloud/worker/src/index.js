const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

const SAFE_ID = /^[A-Za-z0-9._-]{1,160}$/;
const ALLOWED_ARTIFACT_TYPES = new Set(['screenshot', 'video', 'trace', 'report', 'log', 'json', 'html', 'zip', 'file']);
const TERMINAL_STAGES = new Set(['PASSED', 'FAILED', 'EXPIRED', 'CANCELLED', 'STALLED', 'PENDING_UPLOAD', 'INTERRUPTED']);

function securityHeaders(extra = {}) {
  return {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...extra,
  };
}

function json(value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), { status, headers: securityHeaders({ ...JSON_HEADERS, ...extra }) });
}

function text(value, status = 200, contentType = 'text/plain; charset=utf-8') {
  return new Response(value, {
    status,
    headers: securityHeaders({
      'content-type': contentType,
      'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; media-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'",
    }),
  });
}

function bearer(request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export function authorize(request, env, mode = 'read') {
  const token = bearer(request);
  if (mode === 'agent') return Boolean(env?.ARTISYS_QA_AGENT_TOKEN && token === env.ARTISYS_QA_AGENT_TOKEN);
  if (env?.ARTISYS_QA_READ_TOKEN && token === env.ARTISYS_QA_READ_TOKEN) return true;
  const url = new URL(request.url);
  const share = url.searchParams.get('share');
  return Boolean(env?.ARTISYS_QA_SHARE_TOKEN && share === env.ARTISYS_QA_SHARE_TOKEN);
}

function readiness(env) {
  return {
    DB: Boolean(env?.DB),
    R2: Boolean(env?.R2),
    agentToken: Boolean(env?.ARTISYS_QA_AGENT_TOKEN),
    readToken: Boolean(env?.ARTISYS_QA_READ_TOKEN),
    shareToken: Boolean(env?.ARTISYS_QA_SHARE_TOKEN),
  };
}

function requireBindings(env) {
  return Boolean(env?.DB && env?.R2);
}

function safeId(value, label) {
  const text = String(value || '');
  if (!SAFE_ID.test(text)) throw new Error(`${label} is invalid`);
  return text;
}

export function sanitizeArtifactName(value) {
  const normalized = String(value || 'artifact').replace(/\\/g, '/');
  const base = normalized.split('/').filter(Boolean).pop() || 'artifact';
  return base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160) || 'artifact';
}

export function sanitizeArtifactPath(value) {
  const normalized = String(value || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length || parts.some(part => part === '.' || part === '..')) throw new Error('artifact path is invalid');
  return parts.map(part => {
    const clean = part.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
    if (!clean) throw new Error('artifact path is invalid');
    return clean;
  }).join('/');
}

export function artifactKey(projectId, jobId, relativePath) {
  return `projects/${safeId(projectId, 'projectId')}/${safeId(jobId, 'jobId')}/${sanitizeArtifactPath(relativePath)}`;
}

function fnv64(value) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  const bytes = new TextEncoder().encode(String(value));
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function artifactId(jobId, relativePath) {
  return `${safeId(jobId, 'jobId')}-${fnv64(sanitizeArtifactPath(relativePath))}`;
}

let schemaReadyFor = null;
let schemaPromise = null;
async function ensureSchema(env) {
  if (!env?.DB) throw new Error('D1 binding DB is missing');
  if (schemaReadyFor === env.DB && schemaPromise) return schemaPromise;
  schemaReadyFor = env.DB;
  const statements = [
    `CREATE TABLE IF NOT EXISTS machines (id TEXT PRIMARY KEY, name TEXT, version TEXT, status TEXT, stage TEXT, detail TEXT, last_seen_at TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, machine_id TEXT, name TEXT, status TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, machine_id TEXT, project_id TEXT, action TEXT, stage TEXT, status TEXT, detail TEXT, progress_current INTEGER, progress_total INTEGER, flow TEXT, test TEXT, error TEXT, started_at TEXT, updated_at TEXT NOT NULL, finished_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT, machine_id TEXT, project_id TEXT, stage TEXT, detail TEXT, progress_current INTEGER, progress_total INTEGER, flow TEXT, test TEXT, error TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, project_id TEXT NOT NULL, type TEXT, name TEXT NOT NULL, r2_key TEXT NOT NULL UNIQUE, size INTEGER, content_type TEXT, created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_events_job_id ON events(job_id, id DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id, created_at DESC)`,
  ];
  schemaPromise = env.DB.batch(statements.map(sql => env.DB.prepare(sql))).then(() => true).catch(error => {
    schemaReadyFor = null;
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function readJson(request) {
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('JSON object required');
  return body;
}

function stageStatus(stage, supplied) {
  if (supplied != null) return String(supplied);
  const normalized = String(stage || '').toUpperCase();
  if (normalized === 'PASSED') return 'passed';
  if (normalized === 'FAILED') return 'failed';
  if (normalized === 'PENDING_UPLOAD') return 'pending-upload';
  if (TERMINAL_STAGES.has(normalized)) return normalized.toLowerCase();
  return normalized ? 'running' : null;
}

function normalizeJob(body) {
  const progress = body.progress && typeof body.progress === 'object' ? body.progress : null;
  const stage = body.stage == null ? null : String(body.stage);
  return {
    id: safeId(body.jobId || body.id, 'jobId'),
    machineId: body.machineId ? safeId(body.machineId, 'machineId') : null,
    projectId: body.projectId ? safeId(body.projectId, 'projectId') : null,
    action: body.action == null ? null : String(body.action),
    stage,
    status: stageStatus(stage, body.status),
    detail: body.detail == null ? null : String(body.detail),
    progressCurrent: progress?.current == null ? null : Number(progress.current),
    progressTotal: progress?.total == null ? null : Number(progress.total),
    flow: body.flow == null ? null : String(body.flow),
    test: body.test == null ? null : String(body.test),
    error: body.error == null ? null : String(body.error),
    startedAt: body.startedAt || null,
    updatedAt: body.updatedAt || body.at || new Date().toISOString(),
    finishedAt: body.finishedAt || (TERMINAL_STAGES.has(String(stage || '').toUpperCase()) ? body.updatedAt || body.at || new Date().toISOString() : null),
  };
}

async function upsertMachine(env, body) {
  const id = safeId(body.machineId || body.id, 'machineId');
  const now = body.at || new Date().toISOString();
  await env.DB.prepare(`INSERT INTO machines (id,name,version,status,stage,detail,last_seen_at,created_at)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=COALESCE(excluded.version,machines.version),status=excluded.status,stage=excluded.stage,detail=excluded.detail,last_seen_at=excluded.last_seen_at`)
    .bind(id, body.name || id, body.version || null, body.status || 'online', body.stage || body.agent?.stage || null, body.detail || body.agent?.detail || null, now, now).run();
  if (body.projectId) {
    const projectId = safeId(body.projectId, 'projectId');
    await env.DB.prepare(`INSERT INTO projects (id,machine_id,name,status,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET machine_id=excluded.machine_id,name=excluded.name,status=excluded.status,updated_at=excluded.updated_at`)
      .bind(projectId, id, body.projectName || projectId, body.projectStatus || body.stage || 'online', now).run();
  }
  return { ok: true, machineId: id, at: now };
}

async function upsertJob(env, body) {
  const job = normalizeJob(body);
  await env.DB.prepare(`INSERT INTO jobs (id,machine_id,project_id,action,stage,status,detail,progress_current,progress_total,flow,test,error,started_at,updated_at,finished_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET machine_id=COALESCE(excluded.machine_id,jobs.machine_id),project_id=COALESCE(excluded.project_id,jobs.project_id),action=COALESCE(excluded.action,jobs.action),stage=excluded.stage,status=excluded.status,detail=excluded.detail,progress_current=excluded.progress_current,progress_total=excluded.progress_total,flow=excluded.flow,test=excluded.test,error=excluded.error,started_at=COALESCE(jobs.started_at,excluded.started_at),updated_at=excluded.updated_at,finished_at=excluded.finished_at`)
    .bind(job.id, job.machineId, job.projectId, job.action, job.stage, job.status, job.detail, job.progressCurrent, job.progressTotal, job.flow, job.test, job.error, job.startedAt, job.updatedAt, job.finishedAt).run();
  return { ok: true, jobId: job.id };
}

async function insertEvent(env, body) {
  const job = normalizeJob(body);
  const at = body.at || job.updatedAt || new Date().toISOString();
  await upsertJob(env, body);
  await env.DB.prepare(`INSERT INTO events (job_id,machine_id,project_id,stage,detail,progress_current,progress_total,flow,test,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(job.id, job.machineId, job.projectId, job.stage, job.detail, job.progressCurrent, job.progressTotal, job.flow, job.test, job.error, at).run();
  return { ok: true, jobId: job.id, at };
}

async function putArtifact(request, env, parts) {
  const jobId = safeId(parts[0], 'jobId');
  const relativePath = sanitizeArtifactPath(parts.slice(1).join('/') || request.headers.get('x-artifact-name') || 'artifact');
  const displayName = sanitizeArtifactName(relativePath);
  const projectId = safeId(request.headers.get('x-project-id'), 'projectId');
  const typeRaw = String(request.headers.get('x-artifact-type') || 'file').toLowerCase();
  const type = ALLOWED_ARTIFACT_TYPES.has(typeRaw) ? typeRaw : 'file';
  const key = artifactKey(projectId, jobId, relativePath);
  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  await env.R2.put(key, request.body, { httpMetadata: { contentType }, customMetadata: { jobId, projectId, type, name: displayName, relativePath } });
  const object = await env.R2.head(key);
  const size = Number(object?.size || request.headers.get('content-length') || 0);
  const createdAt = new Date().toISOString();
  const id = artifactId(jobId, relativePath);
  await env.DB.prepare(`INSERT INTO artifacts (id,job_id,project_id,type,name,r2_key,size,content_type,created_at) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET type=excluded.type,name=excluded.name,r2_key=excluded.r2_key,size=excluded.size,content_type=excluded.content_type,created_at=excluded.created_at`)
    .bind(id, jobId, projectId, type, relativePath, key, size, contentType, createdAt).run();
  return { ok: true, id, jobId, projectId, type, name: displayName, relativePath, key, size, createdAt };
}

async function listArtifacts(env, jobId) {
  const result = await env.DB.prepare(`SELECT id,job_id AS jobId,project_id AS projectId,type,name,size,content_type AS contentType,created_at AS createdAt FROM artifacts WHERE job_id=? ORDER BY created_at ASC`).bind(jobId).all();
  return result.results || [];
}

async function streamArtifact(env, artifactIdValue) {
  const row = await env.DB.prepare(`SELECT id,r2_key AS r2Key,content_type AS contentType,name FROM artifacts WHERE id=?`).bind(artifactIdValue).first();
  if (!row) return json({ error: 'Artifact not found' }, 404);
  const object = await env.R2.get(row.r2Key);
  if (!object) return json({ error: 'Artifact not found' }, 404);
  const headers = new Headers(securityHeaders({
    'cache-control': 'private, no-store',
    'content-type': row.contentType || object.httpMetadata?.contentType || 'application/octet-stream',
  }));
  if (object.size != null) headers.set('content-length', String(object.size));
  headers.set('content-disposition', `inline; filename="${sanitizeArtifactName(row.name)}"`);
  return new Response(object.body, { headers });
}

function dashboardHtml() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ArtiSys QA Cloud</title><style>
  :root{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark;background:#0d1117;color:#f0f6fc}*{box-sizing:border-box}body{margin:0}.w{max-width:1100px;margin:auto;padding:16px}.c{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:14px;margin:12px 0}.r{display:flex;gap:8px;flex-wrap:wrap;align-items:center}input,button{min-height:44px;border-radius:10px;border:1px solid #30363d;background:#0d1117;color:#fff;padding:9px 12px;font:inherit}input{flex:1;min-width:220px}button{background:#238636;font-weight:700}.muted{color:#8b949e}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.big{font-size:24px;font-weight:800}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.event{border-left:3px solid #30363d;padding:7px 10px;margin:5px 0}.arts{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.art{border:1px solid #30363d;border-radius:10px;padding:10px;overflow:hidden}.preview{width:100%;max-height:220px;object-fit:contain;border-radius:7px;background:#0d1117;margin-top:8px}.ok{color:#3fb950}.bad{color:#f85149}.badge{border:1px solid #30363d;border-radius:999px;padding:5px 9px}@media(max-width:720px){.grid{grid-template-columns:1fr}.w{padding:11px}.big{font-size:21px}}</style></head><body><main class="w">
  <div class="r" style="justify-content:space-between"><div><h1 style="margin-bottom:4px">ArtiSys QA Cloud</h1><div class="muted">D1 + R2 · observabilidade remota</div></div><span id="conn" class="badge muted">desconectado</span></div>
  <div class="c r"><input id="t" type="password" autocomplete="off" placeholder="Read token"><button id="b">Conectar</button></div>
  <div class="grid"><section class="c"><div class="muted">Job atual</div><div id="j" class="big">IDLE</div><div id="d" class="muted"></div><div id="p" class="mono"></div></section><section class="c"><div class="muted">Agentes</div><div id="m" class="mono">—</div></section></div>
  <div class="grid"><section class="c"><strong>Linha do tempo</strong><div id="e" class="muted" style="margin-top:8px">Nenhum job ativo.</div></section><section class="c"><strong>Artefatos</strong><div id="a" class="arts muted" style="margin-top:8px">Nenhum artefato.</div></section></div>
  <section class="c"><strong>Histórico</strong><div id="h" class="mono muted" style="margin-top:8px"></div></section>
</main><script>
let tok='',timer=null,blobUrls=[];const q=id=>document.getElementById(id);function clearBlobs(){for(const u of blobUrls)URL.revokeObjectURL(u);blobUrls=[]}async function req(p,blob=false){const r=await fetch(p,{headers:{authorization:'Bearer '+tok}});if(!r.ok)throw new Error('HTTP '+r.status);return blob?r.blob():r.json()}async function artifactUrl(id){const b=await req('/api/v1/artifacts/'+encodeURIComponent(id),true);const u=URL.createObjectURL(b);blobUrls.push(u);return u}async function renderArtifacts(items){clearBlobs();q('a').innerHTML='';if(!items.length){q('a').textContent='Nenhum artefato.';return}for(const x of items){const c=document.createElement('div');c.className='art';const title=document.createElement('div');title.textContent=(x.type||'file')+' · '+(x.name||x.id);c.appendChild(title);const meta=document.createElement('div');meta.className='muted';meta.textContent=x.size!=null?Math.round(x.size/1024)+' KB':'';c.appendChild(meta);const open=document.createElement('button');open.textContent='Abrir';open.style.marginTop='8px';open.onclick=async()=>{try{window.open(await artifactUrl(x.id),'_blank','noopener')}catch(e){alert(e.message)}};c.appendChild(open);if(x.type==='screenshot'||x.type==='video'){try{const u=await artifactUrl(x.id);if(x.type==='screenshot'){const img=document.createElement('img');img.className='preview';img.src=u;c.appendChild(img)}else{const v=document.createElement('video');v.className='preview';v.src=u;v.controls=true;v.preload='metadata';c.appendChild(v)}}catch{}}q('a').appendChild(c)}}async function refresh(){if(!tok)return;try{const [s,h]=await Promise.all([req('/api/v1/snapshot'),req('/api/v1/history')]);q('conn').textContent='online';q('conn').className='badge ok';const c=s.currentJob;q('j').textContent=c?(c.stage+' · '+c.projectId):'IDLE';q('d').textContent=c?.detail||'Nenhum job ativo';q('p').textContent=c?.progressTotal!=null?String(c.progressCurrent||0)+'/'+String(c.progressTotal):'';q('m').textContent=(s.machines||[]).map(x=>x.id+' · '+(x.version||'?')+' · '+x.status+' · '+x.lastSeenAt).join('\n')||'—';q('h').textContent=(h||[]).slice(0,30).map(x=>x.id+' · '+x.stage+' · '+x.updatedAt).join('\n')||'Sem histórico';if(c){const [ev,arts]=await Promise.all([req('/api/v1/jobs/'+encodeURIComponent(c.id)+'/events'),req('/api/v1/jobs/'+encodeURIComponent(c.id)+'/artifacts')]);q('e').innerHTML='';for(const x of ev.slice(-60)){const d=document.createElement('div');d.className='event';d.textContent=(x.createdAt||'')+' · '+(x.stage||'')+(x.detail?' · '+x.detail:'');q('e').appendChild(d)}await renderArtifacts(arts)}else{q('e').textContent='Nenhum job ativo.';q('a').textContent='Nenhum artefato.';clearBlobs()}}catch(e){q('conn').textContent=e.message;q('conn').className='badge bad'}finally{timer=setTimeout(refresh,2000)}}q('b').onclick=()=>{tok=q('t').value.trim();if(timer)clearTimeout(timer);refresh()};
</script></body></html>`;
}

async function handleRead(request, env, url) {
  if (!authorize(request, env, 'read')) return json({ error: 'Unauthorized' }, 401);
  if (url.pathname === '/api/v1/snapshot') {
    const machines = (await env.DB.prepare(`SELECT id,name,version,status,stage,detail,last_seen_at AS lastSeenAt FROM machines ORDER BY last_seen_at DESC LIMIT 20`).all()).results || [];
    const currentJob = await env.DB.prepare(`SELECT id,project_id AS projectId,machine_id AS machineId,action,stage,status,detail,progress_current AS progressCurrent,progress_total AS progressTotal,flow,test,error,started_at AS startedAt,updated_at AS updatedAt,finished_at AS finishedAt FROM jobs WHERE finished_at IS NULL ORDER BY updated_at DESC LIMIT 1`).first();
    return json({ machines, currentJob });
  }
  if (url.pathname === '/api/v1/history') {
    const rows = (await env.DB.prepare(`SELECT id,project_id AS projectId,machine_id AS machineId,action,stage,status,detail,started_at AS startedAt,updated_at AS updatedAt,finished_at AS finishedAt FROM jobs ORDER BY updated_at DESC LIMIT 100`).all()).results || [];
    return json(rows);
  }
  const jobMatch = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})(?:\/(events|artifacts))?$/);
  if (jobMatch) {
    const jobId = jobMatch[1];
    if (jobMatch[2] === 'events') {
      const rows = (await env.DB.prepare(`SELECT id,job_id AS jobId,machine_id AS machineId,project_id AS projectId,stage,detail,progress_current AS progressCurrent,progress_total AS progressTotal,flow,test,error,created_at AS createdAt FROM events WHERE job_id=? ORDER BY id ASC LIMIT 1000`).bind(jobId).all()).results || [];
      return json(rows);
    }
    if (jobMatch[2] === 'artifacts') return json(await listArtifacts(env, jobId));
    const row = await env.DB.prepare(`SELECT id,project_id AS projectId,machine_id AS machineId,action,stage,status,detail,progress_current AS progressCurrent,progress_total AS progressTotal,flow,test,error,started_at AS startedAt,updated_at AS updatedAt,finished_at AS finishedAt FROM jobs WHERE id=?`).bind(jobId).first();
    return row ? json(row) : json({ error: 'Job not found' }, 404);
  }
  const artifactMatch = url.pathname.match(/^\/api\/v1\/artifacts\/([A-Za-z0-9._-]{1,200})$/);
  if (artifactMatch) return streamArtifact(env, artifactMatch[1]);
  return json({ error: 'Not found' }, 404);
}

async function handleAgent(request, env, url) {
  if (!authorize(request, env, 'agent')) return json({ error: 'Unauthorized' }, 401);
  if (request.method === 'POST' && url.pathname === '/api/v1/heartbeat') return json(await upsertMachine(env, await readJson(request)), 202);
  if (request.method === 'POST' && url.pathname === '/api/v1/jobs/upsert') return json(await upsertJob(env, await readJson(request)), 202);
  if (request.method === 'POST' && url.pathname === '/api/v1/events') return json(await insertEvent(env, await readJson(request)), 202);
  const artifact = url.pathname.match(/^\/api\/v1\/artifacts\/([A-Za-z0-9._-]{1,160})\/(.+)$/);
  if (request.method === 'PUT' && artifact) {
    let relativePath;
    try { relativePath = decodeURIComponent(artifact[2]); }
    catch { return json({ error: 'Invalid artifact path' }, 400); }
    return json(await putArtifact(request, env, [artifact[1], relativePath]), 201);
  }
  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      const state = readiness(env);
      const ok = state.DB && state.R2 && state.agentToken && state.readToken;
      return json({ ok, bindings: { DB: state.DB, R2: state.R2 }, secrets: { agentToken: state.agentToken, readToken: state.readToken, shareToken: state.shareToken } }, ok ? 200 : 503);
    }
    if (request.method === 'GET' && url.pathname === '/') return text(dashboardHtml(), 200, 'text/html; charset=utf-8');
    if (!requireBindings(env)) return json({ error: 'Cloudflare bindings DB and R2 are required' }, 503);
    try {
      await ensureSchema(env);
      if (url.pathname.startsWith('/api/v1/')) {
        if (request.method === 'GET') return handleRead(request, env, url);
        return handleAgent(request, env, url);
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      return json({ error: error?.message || 'Internal error' }, 500);
    }
  },
};
