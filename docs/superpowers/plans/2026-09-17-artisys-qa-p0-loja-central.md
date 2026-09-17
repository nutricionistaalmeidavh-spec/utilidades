# ArtiSys QA P0 — Loja Online + Central Artisys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reaproveitar `@artisys/qa` como runtime único de QA para Loja Online e Central Artisys, com profiles padronizados e uma suíte cross-system configurável.

**Architecture:** O runtime compartilhado permanece em `utilidades/modules/artisys-qa`. Cada consumidor recebe manifest/flows próprios e um script de sync compatível com o padrão já usado pelo PDV ArtiSys. Gates nativos continuam obrigatórios e são encadeados nos profiles `full`/`release`. A suíte cross-system usa HTTP e secrets apenas por ambiente, sem criar bypass de autenticação no owner.

**Tech Stack:** Node.js 22+, Playwright, `@artisys/qa` 2.4.x, npm, Cloudflare Workers/D1.

**Spec:** `docs/superpowers/specs/2026-09-17-artisys-qa-p0-loja-central-design.md`

## Global Constraints

- Não commitar credenciais, cookies ou `LOJAONLINE_LICENSE_SERVICE_SECRET`.
- Não remover nem substituir os gates nativos existentes.
- Não criar endpoint de autenticação QA em produção.
- O runtime compartilhado continua tendo `utilidades/modules/artisys-qa` como source of truth.
- Dados cross-system mutáveis devem usar prefixo `QA-CROSS-` e identificador único.
- Node.js mínimo: 22.

---

### Task 1: Base web SaaS reutilizável no `utilidades`

**Files:**
- Create: `modules/artisys-qa/templates/web-saas/artisys-qa.config.json`
- Create: `modules/artisys-qa/templates/web-saas/flows/00-smoke.json`
- Create: `modules/artisys-qa/templates/web-saas/README.md`
- Create: `modules/artisys-qa/tests/web-saas-template.test.js`
- Modify: `modules/artisys-qa/README.md`

**Interfaces:**
- Consumes: `validateQaManifest(manifest)` e schema de flows já suportado.
- Produces: template web com profiles `quick`, `full`, `release`, captura e convenção de ambientes.

- [ ] Escrever teste que carrega o manifest do template e exige `mode=web`, profiles `quick/full/release` e flow `smoke`.
- [ ] Rodar `node --test tests/web-saas-template.test.js` no módulo e confirmar falha porque o template ainda não existe.
- [ ] Criar o template mínimo e README.
- [ ] Rodar novamente o teste e depois `npm test` no módulo.
- [ ] Documentar no README raiz do módulo.

### Task 2: Loja Online como consumidor

**Files:**
- Create: `qa/artisys-qa.config.json`
- Create: `qa/flows/00-smoke.json`
- Create: `qa/flows/01-auth.json`
- Create: `qa/flows/02-clientes.json`
- Create: `qa/flows/03-produtos.json`
- Create: `qa/flows/04-estoque.json`
- Create: `qa/flows/05-caixa.json`
- Create: `qa/flows/06-vendas.json`
- Create: `qa/flows/07-pedidos.json`
- Create: `qa/flows/08-financeiro.json`
- Create: `qa/flows/09-vitrine.json`
- Create: `qa/flows/10-multitenancy.json`
- Create: `qa/flows/11-licenciamento.json`
- Create: `scripts/sync-artisys-qa.mjs`
- Create: `scripts/qa-local-server.mjs`
- Create: `test/qa-contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@artisys/qa` runtime pinado e E2E nativo atual.
- Produces: `qa:prepare`, `qa:quick`, `qa:full`, `qa:release`.

- [ ] Criar teste de contrato que valida manifest, nomes de profiles, scripts npm e existência dos flows.
- [ ] Confirmar que o teste falha antes dos arquivos/scripts.
- [ ] Criar manifest/flows e scripts de sync/local server.
- [ ] Encadear `npm run check` e `npm run qa:e2e` no release sem removê-los.
- [ ] Rodar teste de contrato, `npm run check`, `npm run qa:e2e`, `npm run qa:quick`, `npm run qa:full` e `npm run qa:release`.

### Task 3: Central Artisys como consumidor

**Files:**
- Create: `apps/web/qa/artisys-qa.config.json`
- Create: `apps/web/qa/flows/00-owner-shell.json`
- Create: `apps/web/qa/flows/01-owner-overview.json`
- Create: `apps/web/qa/flows/02-loja-online.json`
- Create: `apps/web/qa/flows/03-clientes.json`
- Create: `apps/web/qa/flows/04-licencas.json`
- Create: `apps/web/qa/flows/05-auditoria.json`
- Create: `apps/web/qa/flows/06-obra-regression.json`
- Create: `apps/web/qa/flows/07-debora-regression.json`
- Create: `apps/web/scripts/sync-artisys-qa.mjs`
- Create: `apps/web/src/qa-p0-contract.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `@artisys/qa`, build Vite e testes atuais da Central.
- Produces: `qa:prepare`, `qa:quick`, `qa:full`, `qa:release`.

- [ ] Criar teste de contrato para manifest, flows e scripts.
- [ ] Confirmar falha antes da implementação.
- [ ] Criar manifest/flows e sync.
- [ ] Encadear `npm test`, `npm run build` e `npm run ux:verify` no `qa:release`.
- [ ] Rodar teste, build, ux verify e três profiles QA.

### Task 4: Cross-system Central → Loja Online

**Files:**
- Create: `apps/web/scripts/qa-cross-system.mjs`
- Create: `apps/web/src/qa-cross-system-contract.test.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/docs/LOJAONLINE_LICENSING.md`

**Interfaces:**
- Consumes: `ARTISYS_CENTRAL_BASE_URL`, `ARTISYS_LOJAONLINE_BASE_URL`, `LOJAONLINE_LICENSE_SERVICE_SECRET`.
- Produces: `qa-artifacts/cross-system/<timestamp>/report.json` e exit code 0/1.

- [ ] Criar teste do runner em modo dry-run/sem secret, garantindo que secrets não aparecem no relatório.
- [ ] Confirmar falha antes da implementação.
- [ ] Implementar smoke HTTP sem secret e ciclo mutável quando o secret for explicitamente fornecido.
- [ ] Adicionar `qa:cross-system` ao package.json.
- [ ] Documentar variáveis e comportamento.
- [ ] Rodar teste de contrato e smoke read-only.

### Task 5: Verificação integrada

**Files:**
- No new production files.

- [ ] Loja Online: `npm run check`.
- [ ] Loja Online: `npm run qa:e2e` em porta livre.
- [ ] Loja Online: `npm run qa:release`.
- [ ] Central: `npm test`.
- [ ] Central: `npm run build`.
- [ ] Central: `npm run ux:verify`.
- [ ] Central: `npm run qa:release`.
- [ ] Central: `npm run qa:cross-system` sem secret para smoke read-only.
- [ ] Com secret explícito em ambiente controlado, executar o ciclo mutável cross-system.
- [ ] Revisar artefatos e confirmar ausência de secrets.
