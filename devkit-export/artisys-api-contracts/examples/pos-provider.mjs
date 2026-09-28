import { createServer } from 'node:http';

// Contract fixture only. No database, persistence, authentication or production POS rules.
export async function startExampleProvider({ totalCents = 750 } = {}) {
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET' && req.url === '/sales/demo-sale') {
      res.end(JSON.stringify({ id: 'demo-sale', totalCents, status: 'completed' }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not_found' }));
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => {
    server.close(e => e ? reject(e) : resolve());
    server.closeAllConnections();
  }) };
}
