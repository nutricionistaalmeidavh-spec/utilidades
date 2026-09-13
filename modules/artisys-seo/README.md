# ArtiSys SEO

Módulo reutilizável para configurar SEO técnico, auditar páginas, alimentar um dashboard de saúde SEO e consultar o Google Search Console sem depender de serviços pagos.

## Estado

`0.1.0` — `implemented`. O core é R$ 0, self-hosted/open source e não possui dependências de runtime.

O módulo inclui um adapter opcional de leitura do Google Search Console. Ele **não armazena Client ID, Client Secret, refresh token ou access token**: o consumidor fornece `getAccessToken()`. Assim o mesmo projeto/OAuth Client usado para Google Drive pode solicitar também o escopo do Search Console e reutilizar a mesma autorização.

Analytics first-party, Cloudflare D1/Workers, tracking de conversões e alteração automática de conteúdo continuam fora desta fase.

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
  buildSeoDashboardModel,
  SEARCH_CONSOLE_READONLY_SCOPE,
  withSearchConsoleReadonlyScope,
  normalizeSearchConsoleSiteUrl,
  createSearchConsoleClient
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

### Google Search Console

Escopo de leitura usado pelo adapter:

```text
https://www.googleapis.com/auth/webmasters.readonly
```

Para reaproveitar scopes já usados pelo Google Drive:

```js
const scopes = withSearchConsoleReadonlyScope([
  'https://www.googleapis.com/auth/drive.file'
]);
```

O consumidor continua responsável pelo fluxo OAuth e refresh token. O módulo recebe somente um provider de access token:

```js
const searchConsole = createSearchConsoleClient({
  getAccessToken: async () => oauthSession.getAccessToken()
});

const sites = await searchConsole.listSites();

const report = await searchConsole.querySearchAnalytics({
  siteUrl: 'deboralactacao.com',
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  dimensions: ['query', 'page'],
  rowLimit: 1000
});
```

`deboralactacao.com` é normalizado para `sc-domain:deboralactacao.com`. Propriedades URL-prefix como `https://example.com/` também são aceitas.

O adapter expõe somente leitura: lista propriedades e consulta Search Analytics. Ele não altera Search Console nem publica/indexa páginas.

### Dashboard-base

`buildSeoDashboardModel({ siteName, reports })` transforma relatórios em cards, resumo de severidades, tabela por página e navegação. Google Search continua `not-connected` enquanto o produto consumidor não injetar um token/autorização real; o adapter do core já está disponível.

O dashboard desta fase é um **view-model**, não um subdomínio hospedado nem um aplicativo desktop. A UI/hospedagem ficam no consumidor.

## Verificação

```bash
npm test --prefix modules/artisys-seo
npm run example --prefix modules/artisys-seo
npm run check --prefix modules/artisys-seo
```

## Limites

- nenhuma credencial Google no core;
- nenhum Client Secret no pacote;
- refresh de token fica no consumidor;
- requests de rede somente quando o adapter Search Console é chamado explicitamente;
- sem tracking first-party nesta fase;
- sem persistência;
- sem alteração automática de páginas;
- sem dependência de SaaS pago.
