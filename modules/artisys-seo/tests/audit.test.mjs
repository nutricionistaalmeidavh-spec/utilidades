import test from 'node:test';
import assert from 'node:assert/strict';
import { defineSeoConfig, auditSeoDocument, auditSeoConfig } from '../src/index.mjs';

const healthyHtml = `<!doctype html>
<html><head>
<title>Consultoria de amamentação</title>
<meta name="description" content="Atendimento especializado para amamentação.">
<meta name="robots" content="index,follow">
<meta property="og:title" content="Consultoria de amamentação">
<link rel="canonical" href="https://example.com/consultoria">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
</head><body>
<h1>Consultoria de amamentação</h1>
<img src="hero.jpg" alt="Mãe e bebê durante atendimento">
<a href="https://example.com/contato">Contato</a>
</body></html>`;

test('auditSeoDocument gives a healthy document a full score', () => {
  const report = auditSeoDocument({
    html: healthyHtml,
    expected: { canonical: 'https://example.com/consultoria', index: true }
  });
  assert.equal(report.score, 100);
  assert.equal(report.issues.length, 0);
  assert.equal(report.summary.failed, 0);
});

test('auditSeoDocument reports missing and unsafe SEO signals', () => {
  const html = '<html><head><title></title></head><body><h1>A</h1><h1>B</h1><img src="x.jpg"><a href="http://inseguro.test">x</a></body></html>';
  const report = auditSeoDocument({ html, expected: { index: true } });
  const ids = new Set(report.issues.map((issue) => issue.id));
  for (const id of ['title-present', 'description-present', 'canonical-present', 'single-h1', 'image-alt', 'open-graph-title', 'jsonld-valid', 'https-links']) {
    assert.ok(ids.has(id), `missing issue ${id}`);
  }
  assert.ok(report.score < 70);
});

test('auditSeoDocument checks canonical expectation and noindex intent', () => {
  const report = auditSeoDocument({
    html: healthyHtml.replace('https://example.com/consultoria', 'https://example.com/outra'),
    expected: { canonical: 'https://example.com/consultoria', index: false }
  });
  const ids = report.issues.map((issue) => issue.id);
  assert.ok(ids.includes('canonical-match'));
  assert.ok(ids.includes('index-directive'));
});

test('auditSeoConfig detects duplicate titles and descriptions', () => {
  const config = defineSeoConfig({
    site: { name: 'Exemplo', url: 'https://example.com' },
    pages: [
      { path: '/a', title: 'Mesmo título', description: 'Mesma descrição.' },
      { path: '/b', title: 'Mesmo título', description: 'Mesma descrição.' }
    ]
  });
  const report = auditSeoConfig(config);
  const ids = new Set(report.issues.map((issue) => issue.id));
  assert.ok(ids.has('duplicate-title'));
  assert.ok(ids.has('duplicate-description'));
  assert.ok(report.score < 100);
});
