/** In-memory demonstration only: no persistence, authentication or fiscal emission. */
import http from 'node:http';
import { pathToFileURL } from 'node:url';

export function createReferenceServer() {
  const sales = new Map();
  let cash = null;
  let stock = 1;
  let sequence = 0;
  return http.createServer(async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method === 'GET' && req.url === '/health') return reply(200, { ready: true });
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><html lang="pt-BR"><title>PDV de referência QA</title><h1>PDV de referência QA</h1><p>Exemplo em memória; não é o PDV real.</p><button id="sale">Vender último item (R$ 10)</button><output aria-live="polite"></output><script>
      document.querySelector('button').onclick = async () => {
        const response = await fetch('/sales', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:crypto.randomUUID()})});
        document.querySelector('output').textContent = response.ok ? 'Venda concluída' : 'Venda recusada';
      };</script></html>`);
    }
    if (req.method === 'GET' && req.url === '/state') return reply(200, { cash, stock, sales: [...sales.values()] });
    let body = {};
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 8192) return reply(413, { error: 'body-too-large' }); }
      if (raw) body = JSON.parse(raw);
      if (!body || Array.isArray(body) || typeof body !== 'object') return reply(400, { error: 'invalid-body' });
    } catch { return reply(400, { error: 'invalid-json' }); }
    if (req.method !== 'POST') return reply(404, { error: 'not-found' });
    // No await inside the mutation section: each request commits atomically in this single process example.
    if (req.url === '/cash/open') {
      if (cash) return reply(409, { error: 'demo-session-already-opened' });
      if (!Number.isSafeInteger(body.openingCents) || body.openingCents < 0) return reply(400, { error: 'invalid-opening' });
      cash = { open: true, openingCents: body.openingCents, balanceCents: body.openingCents };
      return reply(201, cash);
    }
    if (req.url === '/cash/close') {
      if (!cash?.open) return reply(409, { error: 'cash-closed' });
      cash.open = false;
      return reply(200, cash);
    }
    if (req.url === '/sales') {
      if (typeof body.key !== 'string' || !body.key.trim() || body.key.length > 100) return reply(400, { error: 'invalid-key' });
      const previous = sales.get(body.key);
      if (previous) return reply(200, previous);
      if (!cash?.open) return reply(409, { error: 'cash-closed' });
      if (!stock) return reply(409, { error: 'out-of-stock' });
      const sale = { id: ++sequence, key: body.key, cents: 1000, cancelled: false };
      stock--; cash.balanceCents += sale.cents; sales.set(body.key, sale);
      return reply(201, sale);
    }
    if (req.url === '/sales/cancel') {
      const sale = sales.get(body.key);
      if (!sale) return reply(404, { error: 'sale-not-found' });
      if (!cash?.open) return reply(409, { error: 'cash-closed' });
      if (!sale.cancelled) { sale.cancelled = true; stock++; cash.balanceCents -= sale.cents; }
      return reply(200, sale);
    }
    return reply(404, { error: 'not-found' });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createReferenceServer();
  server.listen(Number(process.env.PORT ?? 4179), '127.0.0.1');
  for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => server.close(() => process.exit(0)));
}
