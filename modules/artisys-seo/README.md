# ArtiSys SEO

Módulo reutilizável para configurar SEO técnico, auditar páginas e alimentar um dashboard de saúde SEO sem depender de serviços pagos.

## Estado

`0.1.0` — `implemented`. O core é R$ 0, self-hosted/open source e não possui dependências de runtime.

Nesta fase o módulo **não** conecta Google Search Console, analytics, Cloudflare D1/Workers nem altera conteúdo publicado automaticamente. Esses recursos ficam reservados para adapters opcionais posteriores.

## API

```js
import {
  defineSeoConfig,
  buildPageSeo,
  renderHeadTags,
  buildRobotsTxt,
  buildSitemapXml,
  auditSeoDocument,
  auditSeoConfig,
  buildSeoDashboardModel
} from '@artisys/seo';
```

### Configuração

```js
const seo = defineSeoConfig({
  site: {
    name: 'Minha marca',
    url: 'https://example.com',
    language: 'pt-BR',
    professional: { name: 'Profissional', jobTitle: 'Consultora' }
  },
  pages: [
    { path: '/', title: 'Página inicial', description: 'Descrição principal.' },
    { path: '/servico', title: 'Serviço', description: 'Descrição do serviço.', priority: 0.8 }
  ]
});
```

### SEO técnico

- `buildPageSeo(config, path)` gera canonical, robots, Open Graph, Twitter Cards e JSON-LD.
- `renderHeadTags(model)` serializa tags seguras para o `<head>`.
- `buildRobotsTxt(config)` gera `robots.txt`.
- `buildSitemapXml(config)` gera `sitemap.xml` apenas com páginas indexáveis.

### Auditoria

`auditSeoDocument({ html, expected })` verifica title, description, canonical, indexação, H1, ALT de imagens, Open Graph, JSON-LD e links HTTP. O retorno contém score 0–100, checks e issues por severidade.

`auditSeoConfig(config)` detecta metadata/canonical duplicados no registro de páginas.

### Dashboard-base

`buildSeoDashboardModel({ siteName, reports })` transforma relatórios em cards, resumo de severidades, tabela por página e navegação. Google Search, analytics e conversões aparecem como `not-connected` até que adapters explícitos sejam configurados.

O dashboard desta fase é um **view-model**, não um subdomínio hospedado nem um aplicativo desktop. A UI/hospedagem ficam no consumidor.

## Verificação

```bash
npm test --prefix modules/artisys-seo
npm run example --prefix modules/artisys-seo
npm run check --prefix modules/artisys-seo
```

## Limites

- sem requests de rede;
- sem credenciais;
- sem tracking;
- sem persistência;
- sem alteração automática de páginas;
- sem dependência de SaaS.
