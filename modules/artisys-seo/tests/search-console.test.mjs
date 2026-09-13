import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEARCH_CONSOLE_READONLY_SCOPE,
  withSearchConsoleReadonlyScope,
  normalizeSearchConsoleSiteUrl,
  createSearchConsoleClient
} from '../src/search-console.mjs';

test('adds Search Console readonly scope without losing existing Google scopes', () => {
  const scopes = withSearchConsoleReadonlyScope([
    'https://www.googleapis.com/auth/drive.file',
    SEARCH_CONSOLE_READONLY_SCOPE
  ]);
  assert.deepEqual(scopes, [
    'https://www.googleapis.com/auth/drive.file',
    SEARCH_CONSOLE_READONLY_SCOPE
  ]);
});

test('normalizes domain properties for Search Console', () => {
  assert.equal(normalizeSearchConsoleSiteUrl('deboralactacao.com'), 'sc-domain:deboralactacao.com');
  assert.equal(normalizeSearchConsoleSiteUrl('sc-domain:deboralactacao.com'), 'sc-domain:deboralactacao.com');
  assert.equal(normalizeSearchConsoleSiteUrl('https://deboralactacao.com/'), 'https://deboralactacao.com/');
});

test('queries Search Analytics with injected OAuth access token', async () => {
  const calls = [];
  const client = createSearchConsoleClient({
    getAccessToken: async () => 'token-123',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ rows: [{ keys: ['consultora de amamentação'], clicks: 12, impressions: 100, ctr: 0.12, position: 4.2 }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  const result = await client.querySearchAnalytics({
    siteUrl: 'deboralactacao.com',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    dimensions: ['query', 'page'],
    rowLimit: 250
  });

  assert.equal(result.rows[0].clicks, 12);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /webmasters\/v3\/sites\/sc-domain%3Adeboralactacao\.com\/searchAnalytics\/query$/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-123');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    dimensions: ['query', 'page'],
    type: 'web',
    rowLimit: 250,
    startRow: 0
  });
});

test('lists Search Console properties with the same token provider', async () => {
  const client = createSearchConsoleClient({
    getAccessToken: async () => 'token-abc',
    fetch: async (url, options) => {
      assert.equal(url, 'https://www.googleapis.com/webmasters/v3/sites');
      assert.equal(options.headers.Authorization, 'Bearer token-abc');
      return new Response(JSON.stringify({ siteEntry: [{ siteUrl: 'sc-domain:deboralactacao.com', permissionLevel: 'siteOwner' }] }), { status: 200 });
    }
  });
  const sites = await client.listSites();
  assert.equal(sites[0].siteUrl, 'sc-domain:deboralactacao.com');
});

test('surfaces Google API failures with status and message', async () => {
  const client = createSearchConsoleClient({
    getAccessToken: async () => 'expired',
    fetch: async () => new Response(JSON.stringify({ error: { message: 'Invalid Credentials' } }), { status: 401 })
  });
  await assert.rejects(
    () => client.listSites(),
    (error) => error.name === 'SearchConsoleApiError' && error.status === 401 && /Invalid Credentials/.test(error.message)
  );
});
