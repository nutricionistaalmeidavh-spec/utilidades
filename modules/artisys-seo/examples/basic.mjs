import {
  defineSeoConfig,
  buildPageSeo,
  renderHeadTags,
  buildRobotsTxt,
  buildSitemapXml,
  buildSeoDashboardModel
} from '../src/index.mjs';

const config = defineSeoConfig({
  site: {
    name: 'Site Exemplo',
    url: 'https://example.com',
    language: 'pt-BR',
    professional: { name: 'Profissional Exemplo', jobTitle: 'Consultora' }
  },
  pages: [
    { path: '/', title: 'Site Exemplo', description: 'Página inicial do site exemplo.' },
    { path: '/servico', title: 'Serviço Exemplo', description: 'Página de serviço.', priority: 0.8 }
  ]
});

console.log(renderHeadTags(buildPageSeo(config, '/')));
console.log('\n--- robots.txt ---\n' + buildRobotsTxt(config));
console.log('\n--- sitemap.xml ---\n' + buildSitemapXml(config));
console.log('\n--- dashboard base ---');
console.log(JSON.stringify(buildSeoDashboardModel({ siteName: config.site.name, reports: [] }), null, 2));
