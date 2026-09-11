import api from './index.js';

function dashboard() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ArtiSys QA Cloud</title><style>
:root{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:dark;background:#0d1117;color:#f0f6fc}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1000px;margin:auto;padding:16px}.card{background:#161b22;border:1px solid #30363d;border-radius:14px;padding:16px;margin:12px 0}.row{display:flex;gap:8px;flex-wrap:wrap}input,button{min-height:44px;border-radius:10px;border:1px solid #30363d;background:#0d1117;color:#f0f6fc;padding:10px 12px;font:inherit}input{flex:1;min-width:180px}button{background:#238636;font-weight:700}.stage{font-size:28px;font-weight:800}.muted{color:#8b949e}.bad{color:#f85149}.ok{color:#3fb950}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.event{border-left:3px solid #30363d;padding:7px 10px;margin:6px 0}.artifact{border:1px solid #30363d;border-radius:10px;padding:10px;margin:8px 0}@media(max-width:720px){.grid{grid-template-columns:1fr}.stage{font-size:22px}}</style></head><body><main class="wrap">
<h1 style="margin-bottom:4px">ArtiSys QA Cloud</h1><div class="muted">D1 + R2 · somente leitura</div>
<section class="card"><div class="row"><input id="token" type="password" placeholder="Token de leitura"><button id="connect">Conectar</button></div><div id="connection" class="muted" style="margin-top:8px">desconectado</div></section>
<div class="grid"><div><section class="card"><div class="muted">Job atual</div><div id="stage" class="stage">IDLE</div><div id="detail" class="muted"></div><div id="progress" class="mono"></div><button id="share" style="margin-top:10px;display:none">Gerar link temporário</button><div id="shareUrl" class="mono muted" style="margin-top:8px"></div></section><section class="card"><strong>Eventos</strong><div id="events" class="muted"></div></section></div><div><section class="card"><strong>Máquinas</strong><div id="machines" class="mono muted"></div></section><section class="card"><strong>Artefatos</strong><div id="artifacts" class="muted"></div></section></div></div>
<section class="card"><strong>Histórico</strong><div id="history" class="mono muted"></div></section>
</main><script>
const $=id=>document.getElementById(id);let token='',timer=null,currentJob=null;
async function apiCall(path,options={}){const response=await fetch(path,{...options,headers:{...(options.headers||{}),authorization:'Bearer '+token}});if(!response.ok)throw new Error('HTTP '+response.status);return response.json()}
async function refresh(){try{const [machines,current,history]=await Promise.all([apiCall('/api/v1/machines'),apiCall('/api/v1/jobs/current'),apiCall('/api/v1/history')]);$('connection').textContent='online';$('connection').className='ok';$('machines').textContent=machines.map(m=>m.id+' · '+(m.version||'?')+' · '+m.status+' · '+m.last_seen_at).join('\n')||'—';$('history').textContent=history.map(j=>j.id+' · '+j.stage+' · '+j.updated_at).join('\n')||'—';const job=current.job;currentJob=job?.id||null;$('stage').textContent=job?.stage||'IDLE';$('detail').textContent=job?.detail||'Nenhum job ativo';$('progress').textContent=job&&job.progress_total!=null?(job.progress_current||0)+'/'+job.progress_total:'';$('share').style.display=currentJob?'inline-block':'none';if(currentJob){const [events,arts]=await Promise.all([apiCall('/api/v1/jobs/'+encodeURIComponent(currentJob)+'/events'),apiCall('/api/v1/jobs/'+encodeURIComponent(currentJob)+'/artifacts')]);$('events').innerHTML='';for(const e of events.slice(-60)){const d=document.createElement('div');d.className='event';d.textContent=e.created_at+' · '+(e.stage||'')+(e.detail?' · '+e.detail:'');$('events').appendChild(d)}$('artifacts').innerHTML='';for(const a of arts){const d=document.createElement('div');d.className='artifact';d.append(document.createTextNode((a.type||'file')+' · '+a.name+' '));const b=document.createElement('button');b.textContent='Abrir';b.onclick=async()=>{const r=await fetch('/api/v1/artifacts/'+encodeURIComponent(a.id),{headers:{authorization:'Bearer '+token}});if(!r.ok)return alert('HTTP '+r.status);window.open(URL.createObjectURL(await r.blob()),'_blank','noopener')};d.appendChild(b);$('artifacts').appendChild(d)}}else{$('events').textContent='';$('artifacts').textContent=''}}catch(error){$('connection').textContent=error.message;$('connection').className='bad'}finally{timer=setTimeout(refresh,2000)}}
$('connect').onclick=()=>{token=$('token').value.trim();sessionStorage.setItem('qaReadToken',token);if(timer)clearTimeout(timer);refresh()};$('share').onclick=async()=>{if(!currentJob)return;try{const out=await apiCall('/api/v1/jobs/'+encodeURIComponent(currentJob)+'/share',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ttlSeconds:1800})});$('shareUrl').textContent=out.url}catch(error){$('shareUrl').textContent=error.message}};const saved=sessionStorage.getItem('qaReadToken');if(saved){$('token').value=saved;token=saved;refresh()}
</script></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(dashboard(), {
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
    return api.fetch(request, env, ctx);
  },
};
