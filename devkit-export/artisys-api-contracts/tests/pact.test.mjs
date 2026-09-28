import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConsumerPact, verifyProvider } from '../src/pact.mjs';
import { startExampleProvider } from '../examples/pos-provider.mjs';

// This fixture is loopback-only. Pact 17's internal forwarding proxy ignores
// NO_PROXY; do not send local demo traffic through a corporate HTTPS proxy.
for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete process.env[key];
process.env.PACT_DO_NOT_TRACK = 'true';

test('real Pact consumer generation + provider verification, including incompatible provider rejection', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'artisys-pact-'));
  const expected = { id: 'demo-sale', totalCents: 750, status: 'completed' };
  try {
    const pact = await createConsumerPact({ consumer: 'ReferenceTerminal', provider: 'ReferenceLocalServer', dir });
    pact.uponReceiving('a completed sale').withRequest({ method: 'GET', path: '/sales/demo-sale' })
      .willRespondWith({ status: 200, headers: { 'Content-Type': 'application/json' }, body: expected });
    await pact.executeTest(async server => {
      const response = await fetch(`${server.url}/sales/demo-sale`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
    });
    const pactUrls = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => join(dir, f));
    assert.equal(pactUrls.length, 1);
    const good = await startExampleProvider();
    try { await verifyProvider({ providerBaseUrl: good.url, pactUrls, logLevel: 'error' }); } finally { await good.close(); }
    const incompatible = await startExampleProvider({ totalCents: '750' });
    try { await assert.rejects(verifyProvider({ providerBaseUrl: incompatible.url, pactUrls, logLevel: 'error' })); } finally { await incompatible.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
