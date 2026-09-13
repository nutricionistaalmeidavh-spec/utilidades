# ArtiSys SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `@artisys/seo` com configuração técnica de SEO, auditor determinístico e dashboard-base reutilizável, sem integrar produtos consumidores nesta entrega.

**Architecture:** Pacote ESM Node 22, sem dependências de runtime, dividido em configuração, geração técnica, auditoria e view-model de dashboard. O catálogo do repo, smoke test e verificações de módulos serão atualizados para reconhecer o novo módulo.

**Tech Stack:** Node.js >=22, ESM, `node:test`, JSON/XML/HTML gerados internamente.

**Spec:** `docs/superpowers/specs/2026-09-13-artisys-seo-design.md`

## Global Constraints

- Core obrigatório: R$ 0 / self-hosted / open source.
- Nenhum SaaS pago obrigatório.
- Não integrar `deboralactacao.com` nesta entrega.
- Não adicionar Search Console, analytics, D1 ou Worker nesta entrega.
- Nenhuma dependência de runtime.
- O consumidor mantém UI, persistência, autenticação e credenciais.

---

### Task 1: Contrato e configuração do módulo

**Files:**
- Create: `modules/artisys-seo/package.json`
- Create: `modules/artisys-seo/module.json`
- Create: `modules/artisys-seo/LICENSE`
- Create: `modules/artisys-seo/src/config.mjs`
- Create: `modules/artisys-seo/src/index.mjs`
- Test: `modules/artisys-seo/tests/config.test.mjs`

**Interfaces:**
- Produces: `defineSeoConfig(input)`, `getSeoPage(config, path)`.

- [ ] Escrever testes que rejeitam site URL inválida, path duplicado e página sem title/description.
- [ ] Confirmar RED com `node --test tests/config.test.mjs`.
- [ ] Implementar normalização/validação mínima.
- [ ] Confirmar GREEN.
- [ ] Criar manifests e export público.

### Task 2: SEO técnico

**Files:**
- Create: `modules/artisys-seo/src/technical.mjs`
- Test: `modules/artisys-seo/tests/technical.test.mjs`
- Create: `modules/artisys-seo/examples/basic.mjs`

**Interfaces:**
- Consumes: `defineSeoConfig`, `getSeoPage`.
- Produces: `buildPageSeo(config, path)`, `renderHeadTags(model)`, `buildRobotsTxt(config)`, `buildSitemapXml(config)`.

- [ ] Escrever testes para canonical, robots, Open Graph, Twitter Card, JSON-LD, escaping, sitemap e exclusão de páginas noindex.
- [ ] Confirmar RED.
- [ ] Implementar geração técnica sem dependências.
- [ ] Confirmar GREEN e executar exemplo.

### Task 3: Auditor SEO

**Files:**
- Create: `modules/artisys-seo/src/audit.mjs`
- Test: `modules/artisys-seo/tests/audit.test.mjs`

**Interfaces:**
- Produces: `auditSeoDocument(input)`, `auditSeoConfig(config)`.

- [ ] Escrever testes para documento saudável e falhas de title, description, canonical, H1, alt, OG e schema.
- [ ] Confirmar RED.
- [ ] Implementar checks com IDs estáveis, severidade e score 0–100.
- [ ] Confirmar GREEN.

### Task 4: Dashboard-base

**Files:**
- Create: `modules/artisys-seo/src/dashboard.mjs`
- Test: `modules/artisys-seo/tests/dashboard.test.mjs`

**Interfaces:**
- Produces: `buildSeoDashboardModel({ siteName, reports })`.

- [ ] Escrever teste de cards, severidades, tabela por página e capacidades futuras `not-connected`.
- [ ] Confirmar RED.
- [ ] Implementar view-model sem framework/UI obrigatória.
- [ ] Confirmar GREEN.

### Task 5: Documentação e catálogo

**Files:**
- Create: `modules/artisys-seo/README.md`
- Modify: `catalog/modules.json`
- Modify: `catalog/module-display.pt-BR.json`
- Modify: `modules/README.md`
- Modify: `README.md`
- Modify: `scripts/check-modules.py`
- Modify: `scripts/reuse-smoke.mjs`

**Interfaces:**
- Catálogo registra `artisys-seo` 0.1.0 como `implemented`.

- [ ] Documentar API e limites da fase 1.
- [ ] Adicionar módulo ao catálogo e nome pt-BR.
- [ ] Adicionar exports esperados ao smoke test.
- [ ] Adicionar módulo às listas de verificação JS/READY.
- [ ] Atualizar contagens e tabela de módulos.

### Task 6: Verificação final

- [ ] Executar `npm test --prefix modules/artisys-seo`.
- [ ] Executar `npm run example --prefix modules/artisys-seo`.
- [ ] Executar verificações do repo disponíveis para o branch.
- [ ] Revisar diff e garantir que nenhum arquivo da Débora foi alterado.
- [ ] Abrir PR para `main` e só concluir após checks verdes.
