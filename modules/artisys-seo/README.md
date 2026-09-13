# ArtiSys SEO

Módulo reutilizável para configurar SEO técnico, auditar páginas, alimentar um dashboard de saúde SEO e consultar o Google Search Console sem depender de serviços pagos.

## Estado

`0.1.0` — `implemented`. O core é R$ 0, self-hosted/open source e não possui dependências de runtime.

O módulo inclui um adapter opcional de leitura do Google Search Console. O core não embute Client ID nem Client Secret. O fluxo local de bootstrap OAuth pode reutilizar automaticamente as credenciais do remote `artisys-qa-drive` do rclone ou as variáveis `ARTISYS_GOOGLE_CLIENT_ID` / `ARTISYS_GOOGLE_CLIENT_SECRET`.

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
  createSearchConsoleClient,
  buildGoogleAuthorizationUrl,
  buildGoogleTokenRequestBody
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

O Drive continua com o token atual do rclone. O Search Console recebe um refresh token próprio usando o mesmo OAuth Client, evitando alterar o remote de Drive.

Para gerar a autorização no computador:

```bash
npm run google:connect --prefix modules/artisys-seo
```

O comando:

1. procura `ARTISYS_GOOGLE_CLIENT_ID` / `ARTISYS_GOOGLE_CLIENT_SECRET`;
2. se não encontrar, tenta ler `client_id` / `client_secret` do remote `artisys-qa-drive` do rclone;
3. sobe um callback temporário em `127.0.0.1` com porta livre;
4. gera e abre o link OAuth com `webmasters.readonly`, `access_type=offline` e `prompt=consent`;
5. valida o `state` retornado pelo Google;
6. troca o código por tokens;
7. salva o token do Search Console em `%LOCALAPPDATA%\ArtiSys\SEO\google-search-console-token.json` no Windows.

O URL OAuth é propositalmente gerado em runtime, porque contém `state` e porta local temporários. Por isso não deve ser persistido nem reutilizado depois.

Uso do adapter:

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

- nenhuma credencial Google hardcoded no core;
- nenhum Client Secret versionado;
- token do Search Console fica separado do token do rclone/Drive;
- requests de rede somente quando o adapter Search Console ou o comando explícito de conexão é usado;
- sem tracking first-party nesta fase;
- sem alteração automática de páginas;
- sem dependência de SaaS pago.
