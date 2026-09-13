import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSearchConsoleOverview } from '../src/index.mjs';

test('loads aggregate metrics plus top queries and pages from Search Console', async () => {
  const calls = [];
  const client = {
    async querySearchAnalytics(input) {
      calls.push(input);
      if (input.dimensions.length === 0) {
        return { rows: [{ clicks: 21, impressions: 420, ctr: 0.05, position: 7.4 }] };
      }
      if (input.dimensions[0] === 'query') {
        return { rows: [{ keys: ['consultoria amamentação'], clicks: 9, impressions: 120, ctr: 0.075, position: 3.2 }] };
      }
      return { rows: [{ keys: ['https://deboralactacao.com/'], clicks: 14, impressions: 280, ctr: 0.05, position: 5.1 }] };
    }
  };

  const overview = await loadSearchConsoleOverview({
    client,
    siteUrl: 'deboralactacao.com',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    rowLimit: 10
  });

  assert.equal(overview.siteUrl, 'sc-domain:deboralactacao.com');
  assert.deepEqual(overview.period, { startDate: '2026-08-01', endDate: '2026-08-31' });
  assert.deepEqual(overview.metrics, { clicks: 21, impressions: 420, ctr: 0.05, position: 7.4 });
  assert.equal(overview.topQueries[0].query, 'consultoria amamentação');
  assert.equal(overview.topPages[0].page, 'https://deboralactacao.com/');
  assert.deepEqual(calls.map((call) => call.dimensions), [[], ['query'], ['page']]);
});

test('returns zero metrics when Search Console has no rows yet', async () => {
  const client = { async querySearchAnalytics() { return { rows: [] }; } };
  const overview = await loadSearchConsoleOverview({
    client,
    siteUrl: 'deboralactacao.com',
    startDate: '2026-09-01',
    endDate: '2026-09-10'
  });
  assert.deepEqual(overview.metrics, { clicks: 0, impressions: 0, ctr: 0, position: null });
  assert.deepEqual(overview.topQueries, []);
  assert.deepEqual(overview.topPages, []);
});
