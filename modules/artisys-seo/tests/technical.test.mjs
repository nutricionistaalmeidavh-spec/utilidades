import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defineSeoConfig,
  buildPageSeo,
  renderHeadTags,
  buildRobotsTxt,
  buildSitemapXml
} from '../src/index.mjs';

function config() {
  return defineSeoConfig({
    site: {
      name: 'Clínica & Cia',
      url: 'https://example.com',
      language: 'pt-BR',
      defaultImage: '/social.jpg',
      professional: { name: 'Débora Exemplo', jobTitle: 'Consultora' },
      twitterSite: '@exemplo'
    },
    pages: [
      { path: '/', title: 'Início & apoio', description: 'Atendimento <humano> e especializado.' },
      { path: '/servico', title: 'Serviço', description: 'Conheça o serviço.', lastModified: '2026-09-13', changeFrequency: 'weekly', priority: 0.8 },
      { path: '/privado', title: 'Privado', description: 'Área privada.', index: false, follow: false }
    ]
  });
}

test('buildPageSeo creates canonical, social metadata and JSON-LD', () => {
  const model = buildPageSeo(config(), '/');
  assert.equal(model.canonical, 'https://example.com/');
  assert.equal(model.robots, 'index,follow');
  assert.equal(model.openGraph.siteName, 'Clínica & Cia');
  assert.equal(model.twitter.site, '@exemplo');
  assert.ok(model.jsonLd.some((entry) => entry['@type'] === 'WebSite'));
  assert.ok(model.jsonLd.some((entry) => entry['@type'] === 'Person'));
});

test('renderHeadTags escapes HTML and emits technical tags', () => {
  const html = renderHeadTags(buildPageSeo(config(), '/'));
  assert.match(html, /<title>Início &amp; apoio<\/title>/);
  assert.match(html, /Atendimento &lt;humano&gt; e especializado\./);
  assert.match(html, /rel="canonical" href="https:\/\/example\.com\/"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
});

test('buildRobotsTxt disallows noindex pages and announces sitemap', () => {
  const robots = buildRobotsTxt(config());
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Disallow: \/privado/);
  assert.match(robots, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);
});

test('buildSitemapXml includes only indexable pages and optional hints', () => {
  const xml = buildSitemapXml(config());
  assert.match(xml, /https:\/\/example\.com\//);
  assert.match(xml, /https:\/\/example\.com\/servico/);
  assert.doesNotMatch(xml, /https:\/\/example\.com\/privado/);
  assert.match(xml, /<lastmod>2026-09-13<\/lastmod>/);
  assert.match(xml, /<changefreq>weekly<\/changefreq>/);
  assert.match(xml, /<priority>0\.8<\/priority>/);
});
