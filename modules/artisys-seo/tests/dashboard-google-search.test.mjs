import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeoDashboardModel } from '../src/index.mjs';

test('dashboard exposes real Search Console metrics when an overview is supplied', () => {
  const googleSearch = {
    siteUrl: 'sc-domain:deboralactacao.com',
    period: { startDate: '2026-08-01', endDate: '2026-08-31' },
    metrics: { clicks: 21, impressions: 420, ctr: 0.05, position: 7.4 },
    topQueries: [{ query: 'consultoria amamentação', clicks: 9, impressions: 120, ctr: 0.075, position: 3.2 }],
    topPages: [{ page: 'https://deboralactacao.com/', clicks: 14, impressions: 280, ctr: 0.05, position: 5.1 }]
  };

  const model = buildSeoDashboardModel({ siteName: 'Débora Lactação', reports: [], googleSearch });

  assert.equal(model.capabilities.googleSearch, 'ready');
  assert.equal(model.navigation.find((item) => item.id === 'google-search').status, 'ready');
  assert.equal(model.navigation.find((item) => item.id === 'keywords').status, 'ready');
  assert.equal(model.googleSearch.siteUrl, 'sc-domain:deboralactacao.com');
  assert.equal(model.cards.find((card) => card.id === 'google-impressions').value, 420);
  assert.equal(model.cards.find((card) => card.id === 'google-clicks').value, 21);
  assert.equal(model.cards.find((card) => card.id === 'google-ctr').value, 5);
  assert.equal(model.cards.find((card) => card.id === 'google-position').value, 7.4);
});
