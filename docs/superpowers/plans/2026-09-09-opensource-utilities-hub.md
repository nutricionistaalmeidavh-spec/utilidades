# Open Source Utilities Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar quatro projetos open source aprovados em `utilidades`, preservando upstream, versão e licença, para consumo posterior por adapters nos sistemas.

**Architecture:** Usar Git submodules fixados em commits exatos e um catálogo JSON como fonte de verdade. `utilidades` não conterá secrets nem regras de negócio dos consumidores; Postiz ficará classificado como serviço isolado por causa da AGPL-3.0.

**Tech Stack:** Git submodules, JSON, Markdown, GitHub.

**Spec:** `docs/superpowers/specs/2026-09-09-opensource-utilities-hub-design.md`

## Global Constraints

- Não armazenar secrets.
- Preservar licenças e autoria upstream.
- Fixar cada dependência em commit conhecido.
- Não copiar Postiz para código proprietário; tratar como serviço isolado.

---

### Task 1: Registrar catálogo e política

**Files:**
- Modify: `README.md`
- Create: `catalog/projects.json`
- Create: `docs/INTEGRATION_GUIDE.md`
- Create: `docs/LICENSES.md`

**Interfaces:**
- Consumes: metadados dos quatro upstreams.
- Produces: catálogo canônico com `id`, `path`, `upstream`, `branch`, `pinnedCommit`, `license` e `consumption`.

- [x] Registrar os quatro projetos e seus commits aprovados.
- [x] Documentar política de adapters, secrets e atualização.
- [x] Documentar tratamento especial do Postiz/AGPL-3.0.

### Task 2: Incorporar upstreams como submodules

**Files:**
- Create: `.gitmodules`
- Create gitlinks em `projects/*`.

**Interfaces:**
- Consumes: `catalog/projects.json`.
- Produces: quatro submodules navegáveis e fixados no commit do catálogo.

- [x] Configurar PaddleOCR em `projects/document-intelligence/paddleocr` no commit `2661c7c0ef5c613e8f93c6e93b2e052399f0f854`.
- [x] Configurar AI Website Cloner em `projects/site-reconstruction/ai-website-cloner-template` no commit `92872bc40ced2c5edb4d5dc9fd3970d40c77f4ca`.
- [x] Configurar PPT Master em `projects/report-engine/ppt-master` no commit `64b65839c7f8096a534c872c03d688a2b2491c8f`.
- [x] Configurar Postiz em `projects/social-publishing/postiz` no commit `36d5fc7b3ac3f17178b1589cf7a7337523017a41`.

### Task 3: Verificar consistência

**Files:**
- Read: `.gitmodules`
- Read: `catalog/projects.json`
- Read: árvore Git da `main`.

**Interfaces:**
- Consumes: entrega das Tasks 1 e 2.
- Produces: evidência de que caminhos, upstreams e commits coincidem.

- [x] Verificado: existem exatamente quatro gitlinks sob `projects/`.
- [x] Verificado: os SHAs dos gitlinks são iguais aos `pinnedCommit` do catálogo.
- [x] Verificado: `.gitmodules` aponta para os quatro repositórios upstream corretos.

**Verification evidence:** árvore Git publicada no commit `0e8db052592fd09dc51f805536d71e1299a37ead`, com quatro entradas `mode=160000` e os SHAs fixados no catálogo.
