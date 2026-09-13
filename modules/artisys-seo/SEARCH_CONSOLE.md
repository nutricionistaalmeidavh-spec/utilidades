# Google Search Console no ArtiSys SEO

## Objetivo

O módulo usa o mesmo projeto OAuth Google já configurado para a ArtiSys, mas mantém o token do Search Console separado do token do rclone/Drive. O core nunca comita Client ID, Client Secret ou refresh token.

## Autorização local única

```powershell
npm run google:connect --prefix modules/artisys-seo
```

O comando reutiliza `ARTISYS_GOOGLE_CLIENT_ID` / `ARTISYS_GOOGLE_CLIENT_SECRET` ou as credenciais do remote rclone `artisys-qa-drive`, abre o navegador e salva o token em:

```text
%LOCALAPPDATA%\ArtiSys\SEO\google-search-console-token.json
```

## Verificação e relatório

Para validar a autorização e uma propriedade específica:

```powershell
npm run google:check --prefix modules/artisys-seo -- --site=example.com
```

Para saída JSON, apropriada para automações:

```powershell
npm run google:report --prefix modules/artisys-seo -- --site=example.com
```

O comando valida o refresh token, lista propriedades verificadas e consulta os últimos 28 dias disponíveis (terminando dois dias antes do dia atual) para obter:

- impressões;
- cliques;
- CTR;
- posição média;
- principais consultas;
- principais páginas.

## Uso em backend / Cloudflare Worker

O runtime do core é compatível com ambientes que oferecem `fetch` global. O consumidor injeta segredos pelo próprio cofre do ambiente:

```js
import {
  createGoogleRefreshTokenProvider,
  createSearchConsoleClient,
  loadSearchConsoleOverview,
  buildSeoDashboardModel
} from '@artisys/seo';

const getAccessToken = createGoogleRefreshTokenProvider({
  clientId: env.ARTISYS_GOOGLE_CLIENT_ID,
  clientSecret: env.ARTISYS_GOOGLE_CLIENT_SECRET,
  refreshToken: env.ARTISYS_GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
});

const client = createSearchConsoleClient({ getAccessToken });
const googleSearch = await loadSearchConsoleOverview({
  client,
  siteUrl: 'example.com',
  startDate: '2026-08-01',
  endDate: '2026-08-31'
});

const dashboard = buildSeoDashboardModel({
  siteName: 'Meu site',
  reports: [],
  googleSearch
});
```

## Segredos esperados no consumidor hospedado

```text
ARTISYS_GOOGLE_CLIENT_ID
ARTISYS_GOOGLE_CLIENT_SECRET
ARTISYS_GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
```

Esses valores devem existir apenas no secret store do ambiente. Nunca devem entrar em Git, bundle frontend, HTML ou resposta pública da API.

## Separação do login do produto

A autorização administrativa do Search Console não depende do login Google de clientes, pacientes ou profissionais do produto. A conta que concedeu o refresh token é a conta usada para consultar as propriedades do Search Console.
