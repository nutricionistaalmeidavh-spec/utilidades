# ArtiSys SEO — Design

## Objetivo

Criar `artisys-seo` como módulo reutilizável do repositório `utilidades`, sem integrar ainda qualquer produto consumidor. O módulo deve configurar SEO técnico, auditar páginas e produzir um modelo de dashboard capaz de receber dados de Search Console/analytics em etapas futuras.

## Escopo desta entrega

1. Core de configuração e registro de páginas.
2. Geração de SEO técnico: metadata, canonical, Open Graph, Twitter Cards, robots.txt, sitemap.xml e JSON-LD.
3. Auditor técnico de HTML/configuração com score e issues estruturadas.
4. Dashboard-base como view-model reutilizável, sem hospedagem, autenticação ou integração externa.

Ficam fora desta entrega: integração com `deboralactacao.com`, Google Search Console API, tracking de cliques/pageviews, Cloudflare D1/Workers e alterações automáticas de conteúdo publicado.

## Restrições globais

- Core obrigatório: R$ 0, self-hosted/open source, sem SaaS pago obrigatório.
- Node.js >= 22, ESM, sem dependências de runtime nesta primeira versão.
- O consumidor mantém regras de negócio, UI final, persistência, autenticação e credenciais.
- Serviços externos futuros entram somente como adapters opcionais explícitos.
- O módulo não publica nem altera páginas sozinho; gera artefatos e recomendações determinísticas.

## Arquitetura

`@artisys/seo` será um pacote ESM em `modules/artisys-seo` com responsabilidades separadas:

- `config.mjs`: valida/normaliza configuração do site e páginas.
- `technical.mjs`: gera artefatos SEO técnicos e head model.
- `audit.mjs`: audita HTML e configuração, retornando score, checks e issues.
- `dashboard.mjs`: agrega relatórios de auditoria em um view-model para UI.
- `index.mjs`: superfície pública estável do pacote.

O módulo não dependerá de `artisys-dashboard` em runtime. Em consumidores, o view-model poderá ser apresentado com `artisys-dashboard` ou qualquer outra UI.

## Contratos principais

### `defineSeoConfig(input)`

Recebe um objeto com `site` e `pages`. Valida URL absoluta HTTP(S), nome, idioma e paths. Retorna snapshot normalizado e imutável por convenção.

### `buildPageSeo(config, path)`

Retorna modelo serializável contendo title, description, canonical, robots, Open Graph, Twitter Card e JSON-LD básico (`WebSite`, `WebPage`, `Person`/`Organization` quando configurado).

### `renderHeadTags(model)`

Serializa o modelo técnico em tags HTML escapadas, apropriadas para inserção no `<head>` pelo consumidor.

### `buildRobotsTxt(config)`

Gera robots.txt com sitemap e exclusão automática de páginas `index: false`.

### `buildSitemapXml(config)`

Gera XML com páginas indexáveis; suporta `lastModified`, `changeFrequency` e `priority` quando fornecidos.

### `auditSeoDocument(input)`

Audita uma string HTML e contexto esperado. Verifica title, description, canonical, robots/noindex, H1, headings, imagens sem alt, Open Graph, schema JSON-LD e links inseguros/quebrados sintaticamente. Retorna `{ score, checks, issues, summary }`.

### `auditSeoConfig(config)`

Verifica duplicidade de title/description/canonical, páginas indexáveis sem metadata mínima e conflitos de paths.

### `buildSeoDashboardModel(input)`

Agrega relatórios de páginas em cards, distribuição de severidade, tabela resumida e navegação. Áreas futuras (`googleSearch`, `analytics`, `conversions`) aparecem como capacidades `not-connected`, sem dados fictícios.

## Auditoria e score

Checks têm severidade `critical`, `warning` ou `info` e resultado `pass`/`fail`. O score parte de 100 e desconta pesos fixos por falha, limitado a 0–100. O relatório sempre inclui identificador estável para cada regra.

## Segurança

- Todo conteúdo interpolado em HTML/XML é escapado.
- `javascript:` e URLs não HTTP(S) não são aceitos como canonical/site URL.
- JSON-LD é serializado por JSON.stringify e protegido contra fechamento de `<script>`.
- O auditor não executa scripts nem faz requests de rede.

## Dashboard-base

Nesta fase o dashboard é um contrato/view-model, não um subdomínio e não um app desktop. A hospedagem (por exemplo `seo.<dominio>`) será responsabilidade do produto consumidor quando a integração real começar.

## Testes

Testes Node `node:test` cobrem validação, geração técnica, escaping, sitemap/robots, auditoria, score e agregação do dashboard. O módulo entra em `scripts/check-modules.py` e `scripts/reuse-smoke.mjs` para validação do repositório.
