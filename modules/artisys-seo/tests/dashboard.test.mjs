import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeoDashboardModel } from '../src/index.mjs';

test('buildSeoDashboardModel aggregates audit reports without inventing external data', () => {
  const model = buildSeoDashboardModel({
    siteName: 'Site Exemplo',
    reports: [
      { path: '/', score: 90, issues: [{ id: 'a', severity: 'warning' }] },
      { path: '/servico', score: 60, issues: [{ id: 'b', severity: 'critical' }, { id: 'c', severity: 'info' }] }
    ]
  });

  assert.equal(model.siteName, 'Site Exemplo');
  assert.equal(model.healthScore, 75);
  assert.deepEqual(model.summary, { pages: 2, problems: 3, critical: 1, warning: 1, info: 1 });
  assert.equal(model.pages[0].status, 'healthy');
  assert.equal(model.pages[1].status, 'critical');
  assert.equal(model.capabilities.googleSearch, 'not-connected');
  assert.equal(model.capabilities.analytics, 'not-connected');
  assert.equal(model.capabilities.conversions, 'not-connected');
  assert.equal(model.cards.find((card) => card.id === 'health').value, 75);
});

test('buildSeoDashboardModel handles an empty project without fake metrics', () => {
  const model = buildSeoDashboardModel({ siteName: 'Novo site', reports: [] });
  assert.equal(model.healthScore, null);
  assert.equal(model.summary.pages, 0);
  assert.equal(model.cards.find((card) => card.id === 'health').value, null);
});
