import test from 'node:test';
import assert from 'node:assert/strict';
import { defineSeoConfig, getSeoPage } from '../src/index.mjs';

function validInput() {
  return {
    site: { name: 'Exemplo', url: 'https://example.com/', language: 'pt-BR' },
    pages: [
      { path: '/', title: 'Página inicial', description: 'Descrição da página inicial.' },
      { path: '/servico/', title: 'Serviço', description: 'Descrição do serviço.', priority: 0.8 }
    ]
  };
}

test('defineSeoConfig normalizes site URL and page paths', () => {
  const config = defineSeoConfig(validInput());
  assert.equal(config.site.url, 'https://example.com');
  assert.equal(config.pages[1].path, '/servico');
  assert.equal(getSeoPage(config, '/servico/').title, 'Serviço');
  assert.equal(config.pages[0].index, true);
  assert.equal(config.pages[0].follow, true);
});

test('defineSeoConfig rejects invalid site protocols', () => {
  const input = validInput();
  input.site.url = 'javascript:alert(1)';
  assert.throws(() => defineSeoConfig(input), /site\.url/);
});

test('defineSeoConfig rejects duplicate normalized paths', () => {
  const input = validInput();
  input.pages.push({ path: '/servico', title: 'Duplicada', description: 'Outra descrição.' });
  assert.throws(() => defineSeoConfig(input), /duplicate page path/);
});

test('defineSeoConfig requires title and description for every page', () => {
  const input = validInput();
  input.pages[0].description = '   ';
  assert.throws(() => defineSeoConfig(input), /description/);
});

test('defineSeoConfig resolves images and validates sitemap hints', () => {
  const input = validInput();
  input.site.defaultImage = '/assets/social.jpg';
  input.pages[1].lastModified = '2026-09-13';
  input.pages[1].changeFrequency = 'weekly';
  const config = defineSeoConfig(input);
  assert.equal(config.site.defaultImage, 'https://example.com/assets/social.jpg');
  assert.equal(config.pages[1].lastModified, '2026-09-13');
  assert.equal(config.pages[1].changeFrequency, 'weekly');
});
