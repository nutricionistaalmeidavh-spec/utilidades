# ArtiSys Release Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um módulo reutilizável que valide artefatos/releases ArtiSys em runners locais ou CI e produza um gate objetivo de aprovação com evidências.

**Architecture:** O consumidor define um perfil; o runner executa fases/cenários por interfaces injetáveis, adapters tratam processo/HTTP/NSIS e o report builder persiste JSON/HTML. O módulo não contém regras de negócio de nenhum produto.

**Tech Stack:** Node.js 22+, ESM, `node:test`, APIs nativas `child_process`, `crypto`, `fs`, `http/https`/`fetch`.

**Spec:** `docs/superpowers/specs/2026-09-11-artisys-release-validator-design.md`

## Global Constraints

- Sem daemon, SaaS, runner self-hosted permanente ou serviço pago obrigatório.
- Processos sem `shell: true`.
- Node.js 22+.
- Fases obrigatórias falham fechado (`BLOCKED`).
- Relatórios não devem incluir segredos conhecidos.
- Regras específicas de produto ficam no consumidor.
- Integração no PDV é trabalho posterior da E56.

---

### Task 1: Contrato de perfil e orquestrador

**Files:**
- Create: `modules/artisys-release-validator/tests/profile-runner.test.mjs`
- Create: `modules/artisys-release-validator/src/profile.mjs`
- Create: `modules/artisys-release-validator/src/runner.mjs`

**Interfaces:**
- Produces: `defineValidationProfile(value)` e `runValidation({profile, executePhase, now})`.

- [ ] **Step 1: Write failing tests** cobrindo profile obrigatório, ordenação, interrupção em falha obrigatória, etapa opcional e resumo `APPROVED/BLOCKED`.
- [ ] **Step 2: Run** `node --test tests/profile-runner.test.mjs` e confirmar falha por módulos ausentes.
- [ ] **Step 3: Implement** validação imutável do profile e runner sequencial com timeout/status normalizados.
- [ ] **Step 4: Run** o teste isolado até ficar verde.
- [ ] **Step 5: Commit** `feat: add release validation profile and runner`.

### Task 2: Adapters de processo, HTTP e Windows/NSIS

**Files:**
- Create: `modules/artisys-release-validator/tests/adapters.test.mjs`
- Create: `modules/artisys-release-validator/src/adapters/command.mjs`
- Create: `modules/artisys-release-validator/src/adapters/http.mjs`
- Create: `modules/artisys-release-validator/src/adapters/nsis.mjs`

**Interfaces:**
- Produces: `runCommand(spec, options)`, `probeHttp(spec)`, `createNsisInstallSpec()`, `createNsisUninstallSpec()`.

- [ ] **Step 1: Write failing tests** para stdout/stderr, exit code, timeout, redaction, HTTP esperado e comandos NSIS silenciosos.
- [ ] **Step 2: Run** `node --test tests/adapters.test.mjs` e confirmar falha.
- [ ] **Step 3: Implement** com `spawn`, argumentos separados, kill em timeout, captura limitada e `fetch` com abort controller.
- [ ] **Step 4: Run** testes isolados até verde.
- [ ] **Step 5: Commit** `feat: add release validator adapters`.

### Task 3: Hash, relatórios e CLI

**Files:**
- Create: `modules/artisys-release-validator/tests/report-cli.test.mjs`
- Create: `modules/artisys-release-validator/src/report.mjs`
- Create: `modules/artisys-release-validator/src/artifact.mjs`
- Create: `modules/artisys-release-validator/src/index.mjs`
- Create: `modules/artisys-release-validator/bin/artisys-release-validator.mjs`

**Interfaces:**
- Produces: `sha256File(path)`, `writeValidationReports(result, dir)`, exports públicos e CLI `<profile.mjs>`.

- [ ] **Step 1: Write failing tests** para SHA determinístico, JSON/HTML equivalentes e exit code 0/1 da CLI.
- [ ] **Step 2: Run** teste isolado e confirmar falha.
- [ ] **Step 3: Implement** hashing streaming, escaping HTML, escrita atômica simples e CLI que carrega default export/config.
- [ ] **Step 4: Run** testes isolados até verde.
- [ ] **Step 5: Commit** `feat: add release validator reports and cli`.

### Task 4: Pacote, exemplo e documentação

**Files:**
- Create: `modules/artisys-release-validator/package.json`
- Create: `modules/artisys-release-validator/module.json`
- Create: `modules/artisys-release-validator/README.md`
- Create: `modules/artisys-release-validator/LICENSE`
- Create: `modules/artisys-release-validator/examples/basic.mjs`
- Create: `modules/artisys-release-validator/examples/pdv-profile.example.mjs`

**Interfaces:**
- Produces pacote `@artisys/release-validator` 0.1.0.

- [ ] **Step 1: Add package metadata** com `test`, `check`, `example` e `bin`.
- [ ] **Step 2: Add examples** sem dependência de produto real; um exemplo genérico executável e um perfil PDV apenas documental.
- [ ] **Step 3: Run** `npm test`, `npm run check`, `npm run example`, `npm pack --dry-run`.
- [ ] **Step 4: Commit** `docs: package release validator module`.

### Task 5: Catálogo e verificação global

**Files:**
- Modify: `catalog/modules.json`
- Modify: `modules/README.md`
- Modify: `docs/MODULE_KITS.md`
- Modify: `scripts/check-modules.py`
- Modify: `.github/workflows/module-checks.yml`
- Create: `.github/workflows/artisys-release-validator-ci.yml`

**Interfaces:**
- Produces registro oficial do módulo e gates Linux/Windows.

- [ ] **Step 1: Register** `artisys-release-validator` 0.1.0 como `implemented`, `local-or-ci`, sem upstream obrigatório.
- [ ] **Step 2: Include** o pacote em `READY`, `JS_MODULES`, `NEW_PRODUCT_MODULES` e no workflow de checks.
- [ ] **Step 3: Add dedicated CI** com matrix `ubuntu-latest`/`windows-latest` executando test/check/example/package dry-run.
- [ ] **Step 4: Run/observe** CI do PR e corrigir qualquer regressão.
- [ ] **Step 5: Commit** `ci: verify ArtiSys release validator`.

### Task 6: Revisão e integração

**Files:** todos os anteriores.

- [ ] **Step 1: Review** diff para ausência de paths destrutivos, `shell:true`, segredos e regras de produto embutidas.
- [ ] **Step 2: Verify** HEAD exato com todos os workflows verdes.
- [ ] **Step 3: Create/update PR** com escopo, testes e limitações.
- [ ] **Step 4: Squash merge** em `main` usando expected head SHA.
- [ ] **Step 5: Verify** CI pós-merge quando aplicável e registrar commit final.
