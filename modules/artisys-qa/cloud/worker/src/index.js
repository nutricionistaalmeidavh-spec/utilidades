const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

const SAFE_ID = /^[A-Za-z0-9._-]{1,160}$/;
const TERMINAL_STAGES = new Set(['PASSED', 'FAILED', 'EXPIRED', 'CANCELLED', 'STALLED', 'PENDING_UPLOAD', 'INTERRUPTED']);

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function html(value) {
  return new Response(value, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; media-src 'self' blob:; base-uri 'none'; frame-ancestors 'none'",
    },
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
  const share = new URL(request.url).searchParams.get('share');
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

function safeId(value, label) {
  const text = String(value || '');
  if (!SAFE_ID.test(text)) throw new Error(`${label} is invalid`);
  return text;
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

function artifactName(value) {
  return sanitizeArtifactPath(value).split('/').pop();
}

export function artifactKey(projectId, jobId, relativePath) {
  return `projects/${safeId(projectId, 'projectId')}/${safeId(jobId, 'jobId')}/${sanitizeArtifactPath(relativePath)}`;
}

function fnv64(value) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(String(value))) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function artifactId(jobId, relativePath) {
  return `${safeId(jobId, 'jobId')}-${fnv64(sanitizeArtifactPath(relativePath))}`;
}

let readyDb = null;
let readyPromise = null;
async function ensureSchema(env) {
  if (!env?.DB) throw new Error('D1 binding DB is missing');
  if (readyDb === env.DB && readyPromise) return readyPromise;
  readyDb = env.DB;
  const sql = [
    `CREATE TABLE IF NOT EXISTS machines (id TEXT PRIMARY KEY, name TEXT, version TEXT, status TEXT, stage TEXT, detail TEXT, last_seen_at TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, machine_id TEXT, name TEXT, status TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, machine_id TEXT, project_id TEXT, action TEXT, stage TEXT, status TEXT, detail TEXT, progress_current INTEGER, progress_total INTEGER, flow TEXT, test TEXT, error TEXT, started_at TEXT, updated_at TEXT NOT NULL, finished_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL, machine_id TEXT, project_id TEXT, stage TEXT, detail TEXT, progress_current INTEGER, progress_total INTEGER, flow TEXT, test TEXT, error TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, job_id TEXT NOT NULL, project_id TEXT NOT NULL, machine_id TEXT, type TEXT, name TEXT NOT NULL, r2_key TEXT NOT NULL UNIQUE, size INTEGER, content_type TEXT, created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_events_job_id ON events(job_id, id ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id, created_at ASC)`,
  ];
  readyPromise = env.DB.batch(sql.map(statement => env.DB.prepare(statement))).catch(error => {
    readyDb = null;
    readyPromise = null;
    throw error;
  });
  return readyPromise;
}

function stageStatus(stage) {
  const normalized = String(stage || '').toUpperCase();
  if (normalized === 'PASSED') return 'passed';
  if (normalized === 'FAILED') return 'failed';
  if (normalized === 'PENDING_UPLOAD') return 'pending-upload';
  if (TERMINAL_STAGES.has(normalized)) return normalized.toLowerCase();
  return normalized ? 'running' : null;
}

function normalizeEvent(body, routeJobId) {
  const progress = body?.progress && typeof body.progress === 'object' ? body.progress : {};
  const stage = body?.stage == null ? null : String(body.stage);
  const updatedAt = body?.updatedAt || body?.at || new Date().toISOString();
  return {
    jobId: safeId(routeJobId || body?.jobId, 'jobId'),
    machineId: body?.machineId ? safeId(body.machineId, 'machineId') : null,
    projectId: body?.projectId ? safeId(body.projectId, 'projectId') : null,
    action: body?.action == null ? null : String(body.action),
    stage,
    status: body?.status == null ? stageStatus(stage) : String(body.status),
    detail: body?.detail == null ? null : String(body.detail),
    current: progress.current == null ? null : Number(progress.current),
    total: progress.total == null ? null : Number(progress.total),
    flow: body?.flow == null ? null : String(body.flow),
    test: body?.test == null ? null : String(body.test),
    error: body?.error == null ? null : String(body.error),
    startedAt: body?.startedAt || null,
    updatedAt,
    finishedAt: body?.finishedAt || (TERMINAL_STAGES.has(String(stage || '').toUpperCase()) ? updatedAt : null),
  };
}

async function bodyJson(request) {
  const value = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON object required');
  return value;
}

async function heartbeat(env, body) {
  const machineId = safeId(body.machineId, 'machineId');
  const at = body.at || new Date().toISOString();
  await env.DB.prepare(`INSERT INTO machines (id,name,version,status,stage,detail,last_seen_at,created_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,version=COALESCE(excluded.version,machines.version),status=excluded.status,stage=excluded.stage,detail=excluded.detail,last_seen_at=excluded.last_seen_at`)
    .bind(machineId, body.name || machineId, body.version || null, body.status || 'online', body.stage || null, body.detail || null, at, at).run();
  if (body.projectId) {
    const projectId = safeId(body.projectId, 'projectId');
    await env.DB.prepare(`INSERT INTO projects (id,machine_id,name,status,updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET machine_id=excluded.machine_id,name=excluded.name,status=excluded.status,updated_at=excluded.updated_at`)
      .bind(projectId, machineId, body.projectName || projectId, body.stage || 'online', at).run();
  }
  return { ok: true, machineId, at };
}

async function transition(env, routeJobId, body) {
  const event = normalizeEvent(body, routeJobId);
  await env.DB.prepare(`INSERT INTO jobs (id,machine_id,project_id,action,stage,status,detail,progress_current,progress_total,flow,test,error,started_at,updated_at,finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET machine_id=COALESCE(excluded.machine_id,jobs.machine_id),project_id=COALESCE(excluded.project_id,jobs.project_id),action=COALESCE(excluded.action,jobs.action),stage=excluded.stage,status=excluded.status,detail=excluded.detail,progress_current=excluded.progress_current,progress_total=excluded.progress_total,flow=excluded.flow,test=excluded.test,error=excluded.error,started_at=COALESCE(jobs.started_at,excluded.started_at),updated_at=excluded.updated_at,finished_at=excluded.finished_at`)
    .bind(event.jobId, event.machineId, event.projectId, event.action, event.stage, event.status, event.detail, event.current, event.total, event.flow, event.test, event.error, event.startedAt, event.updatedAt, event.finishedAt).run();
  await env.DB.prepare(`INSERT INTO events (job_id,machine_id,project_id,stage,detail,progress_current,progress_total,flow,test,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(event.jobId, event.machineId, event.projectId, event.stage, event.detail, event.current, event.total, event.flow, event.test, event.error, body.at || event.updatedAt).run();
  return { ok: true, jobId: event.jobId, stage: event.stage };
}

async function uploadArtifact(request, env, jobId, url) {
  const machineId = safeId(url.searchParams.get('machineId'), 'machineId');
  const projectId = safeId(url.searchParams.get('projectId'), 'projectId');
  const type = String(url.searchParams.get('type') || 'file').slice(0, 40);
  const rawPath = url.searchParams.get('relativePath') || url.searchParams.get('name') || 'artifact';
  const relativePath = sanitizeArtifactPath(rawPath);
  const name = artifactName(relativePath);
  const key = artifactKey(projectId, jobId, relativePath);
  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  await env.R2.put(key, request.body, {
    httpMetadata: { contentType },
    customMetadata: { machineId, projectId, jobId, type, name, relativePath },
  });
  const object = await env.R2.head(key);
  const size = Number(object?.size || request.headers.get('content-length') || 0);
  const createdAt = url.searchParams.get('createdAt') || new Date().toISOString();
  const id = artifactId(jobId, relativePath);
  await env.DB.prepare(`INSERT INTO artifacts (id,job_id,project_id,machine_id,type,name,r2_key,size,content_type,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET type=excluded.type,name=excluded.name,r2_key=excluded.r2_key,size=excluded.size,content_type=excluded.content_type,created_at=excluded.created_at`)
    .bind(id, jobId, projectId, machineId, type, relativePath, key, size, contentType, createdAt).run();
  return { ok: true, id, jobId, projectId, type, name, relativePath, size, createdAt };
}

async function artifacts(env, jobId) {
  const result = await env.DB.prepare(`SELECT id,job_id AS jobId,project_id AS projectId,machine_id AS machineId,type,name,size,content_type AS contentType,created_at AS createdAt FROM artifacts WHERE job_id=? ORDER BY created_at ASC`).bind(jobId).all();
  return result.results || [];
}

async function artifactResponse(env, id) {
  const row = await env.DB.prepare(`SELECT id,r2_key AS r2Key,content_type AS contentType,name FROM artifacts WHERE id=?`).bind(id).first();
  if (!row) return json({ error: 'Artifact not found' }, 404);
  const object = await env.R2.get(row.r2Key);
  if (!object) return json({ error: 'Artifact not found' }, 404);
  const headers = new Headers({
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'content-type': row.contentType || object.httpMetadata?.contentType || 'application/octet-stream',
    'content-disposition': `inline; filename="${artifactName(row.name)}"`,
  });
  if (object.size != null) headers.set('content-length', String(object.size));
  return new Response(object.body, { headers });
}

function dashboard() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ArtiSys QA Cloud</title><style>
  :root{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark;background:#0d1117;color:#f0f6fc}*{box-sizing:border-box}body{margin:0}.w{max-width:1100px;margin:auto;padding:14px}.c{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:14px;margin:12px 0}.r{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.muted{color:#8b949e}.mono{font-family:ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.big{font-size:24px;font-weight:800}input,button{min-height:44px;border:1px solid #30363d;border-radius:10px;background:#0d1117;color:#fff;padding:9px 12px;font:inherit}input{flex:1;min-width:220px}button{background:#238636;font-weight:700}.badge{border:1px solid #30363d;border-radius:999px;padding:5px 9px}.ok{color:#3fb950}.bad{color:#f85149}.event{border-left:3px solid #30363d;padding:7px 10px;margin:5px 0}.arts{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.art{border:1px solid #30363d;border-radius:10px;padding:10px}.preview{width:100%;max-height:230px;object-fit:contain;border-radius:7px;background:#0d1117;margin-top:8px}@media(max-width:720px){.grid{grid-template-columns:1fr}.w{padding:10px}.big{font-size:21px}}</style></head><body><main class="w">
  <div class="r" style="justify-content:space-between"><div><h1 style="margin-bottom:4px">ArtiSys QA Cloud</h1><div class="muted">D1 + R2 · status, eventos e evidências</div></div><span id="conn" class="badge muted">desconectado</span></div>
  <div class="c r"><input id="token" type="password" autocomplete="off" placeholder="Read token"><button id="connect">Conectar</button></div>
  <div class="grid"><section class="c"><div class="muted">Job atual</div><div id="job" class="big">IDLE</div><div id="detail" class="muted"></div><div id="progress" class="mono"></div></section><section class="c"><div class="muted">Agentes</div><div id="machines" class="mono">—</div></section></div>
  <div class="grid"><section class="c"><strong>Linha do tempo</strong><div id="events" class="muted" style="margin-top:8px">Nenhum job ativo.</div></section><section class="c"><strong>Artefatos</strong><div id="artifacts" class="arts muted" style="margin-top:8px">Nenhum artefato.</div></section></div>
  <section class="c"><strong>Histórico</strong><div id="history" class="mono muted" style="margin-top:8px"></div></section>
</main><script>
let token='',timer=null,urls=[];const q=id=>document.getElementById(id);function clearUrls(){for(const u of urls)URL.revokeObjectURL(u);urls=[]}async function api(p,blob=false){const r=await fetch(p,{headers:{authorization:'Bearer '+token}});if(!r.ok)throw new Error('HTTP '+r.status);return blob?r.blob():r.json()}async function blobUrl(id){const u=URL.createObjectURL(await api('/api/v1/artifacts/'+encodeURIComponent(id),true));urls.push(u);return u}async function renderArtifacts(items){clearUrls();q('artifacts').innerHTML='';if(!items.length){q('artifacts').textContent='Nenhum artefato.';return}for(const x of items){const c=document.createElement('div');c.className='art';const t=document.createElement('div');t.textContent=(x.type||'file')+' · '+(x.name||x.id);c.appendChild(t);const meta=document.createElement('div');meta.className='muted';meta.textContent=x.size!=null?Math.round(x.size/1024)+' KB':'';c.appendChild(meta);const b=document.createElement('button');b.textContent='Abrir';b.style.marginTop='8px';b.onclick=async()=>window.open(await blobUrl(x.id),'_blank','noopener');c.appendChild(b);if(x.type==='screenshot'||x.type==='video'){try{const u=await blobUrl(x.id);if(x.type==='screenshot'){const e=document.createElement('img');e.className='preview';e.src=u;c.appendChild(e)}else{const e=document.createElement('video');e.className='preview';e.src=u;e.controls=true;e.preload='metadata';c.appendChild(e)}}catch{}}q('artifacts').appendChild(c)}}async function refresh(){if(!token)return;try{const [s,h]=await Promise.all([api('/api/v1/snapshot'),api('/api/v1/history')]);q('conn').textContent='online';q('conn').className='badge ok';const j=s.currentJob;q('job').textContent=j?(j.stage+' · '+j.projectId):'IDLE';q('detail').textContent=j?.detail||'Nenhum job ativo';q('progress').textContent=j?.progressTotal!=null?String(j.progressCurrent||0)+'/'+String(j.progressTotal):'';q('machines').textContent=(s.machines||[]).map(x=>x.id+' · v'+(x.version||'?')+' · '+x.status+' · '+x.lastSeenAt).join('\n')||'—';q('history').textContent=(h||[]).slice(0,30).map(x=>x.id+' · '+x.stage+' · '+x.updatedAt).join('\n')||'Sem histórico';if(j){const [ev,a]=await Promise.all([api('/api/v1/jobs/'+encodeURIComponent(j.id)+'/events'),api('/api/v1/jobs/'+encodeURIComponent(j.id)+'/artifacts')]);q('events').innerHTML='';for(const x of ev.slice(-60)){const e=document.createElement('div');e.className='event';e.textContent=(x.createdAt||'')+' · '+(x.stage||'')+(x.detail?' · '+x.detail:'');q('events').appendChild(e)}await renderArtifacts(a)}else{q('events').textContent='Nenhum job ativo.';q('artifacts').textContent='Nenhum artefato.';clearUrls()}}catch(e){q('conn').textContent=e.message;q('conn').className='badge bad'}finally{timer=setTimeout(refresh,2000)}}q('connect').onclick=()=>{token=q('token').value.trim();if(timer)clearTimeout(timer);refresh()};
</script></body></html>`;
}

async function readApi(request, env, url) {
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
  const job = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})(?:\/(events|artifacts))?$/);
  if (job) {
    const jobId = job[1];
    if (job[2] === 'events') {
      const rows = (await env.DB.prepare(`SELECT id,job_id AS jobId,machine_id AS machineId,project_id AS projectId,stage,detail,progress_current AS progressCurrent,progress_total AS progressTotal,flow,test,error,created_at AS createdAt FROM events WHERE job_id=? ORDER BY id ASC LIMIT 1000`).bind(jobId).all()).results || [];
      return json(rows);
    }
    if (job[2] === 'artifacts') return json(await artifacts(env, jobId));
    const row = await env.DB.prepare(`SELECT id,project_id AS projectId,machine_id AS machineId,action,stage,status,detail,progress_current AS progressCurrent,progress_total AS progressTotal,flow,test,error,started_at AS startedAt,updated_at AS updatedAt,finished_at AS finishedAt FROM jobs WHERE id=?`).bind(jobId).first();
    return row ? json(row) : json({ error: 'Job not found' }, 404);
  }
  const artifact = url.pathname.match(/^\/api\/v1\/artifacts\/([A-Za-z0-9._-]{1,200})$/);
  if (artifact) return artifactResponse(env, artifact[1]);
  return json({ error: 'Not found' }, 404);
}

async function writeApi(request, env, url) {
  if (!authorize(request, env, 'agent')) return json({ error: 'Unauthorized' }, 401);
  if (request.method === 'POST' && url.pathname === '/api/v1/heartbeat') return json(await heartbeat(env, await bodyJson(request)), 202);
  const event = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})\/events$/);
  if (request.method === 'POST' && event) return json(await transition(env, event[1], await bodyJson(request)), 202);
  const artifact = url.pathname.match(/^\/api\/v1\/jobs\/([A-Za-z0-9._-]{1,160})\/artifacts$/);
  if (request.method === 'POST' && artifact) return json(await uploadArtifact(request, env, artifact[1], url), 201);
  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      const state = readiness(env);
      const ok = state.DB && state.R2 && state.agentToken && state.readToken;
      return json({
        ok,
        bindings: { DB: state.DB, R2: state.R2 },
        secrets: { agentToken: state.agentToken, readToken: state.readToken, shareToken: state.shareToken },
      }, ok ? 200 : 503);
    }
    if (request.method === 'GET' && url.pathname === '/') return html(dashboard());
    if (!env?.DB || !env?.R2) return json({ error: 'Cloudflare bindings DB and R2 are required' }, 503);
    try {
      await ensureSchema(env);
      if (request.method === 'GET') return readApi(request, env, url);
      return writeApi(request, env, url);
    } catch (error) {
      return json({ error: error?.message || 'Internal error' }, 500);
    }
  },
};
