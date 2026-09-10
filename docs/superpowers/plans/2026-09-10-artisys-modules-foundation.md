# ArtiSys Modules Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a camada reutilizável `modules/` sem modificar os upstreams de `projects/`.

**Architecture:** `projects/` mantém código externo pinado. `modules/` registra integrações ArtiSys e `catalog/modules.json` funciona como catálogo canônico dos módulos.

**Tech Stack:** Git, JSON, Markdown, upstreams catalogados.

**Spec:** `docs/superpowers/specs/2026-09-10-artisys-modules-foundation-design.md`

## Global Constraints

- Não modificar código dos submodules nesta entrega.
- Não adicionar secrets.
- Preservar as fronteiras de licença existentes.
- Registrar exatamente os 9 módulos prioritários aprovados.

---

### Task 1: Catálogo e documentação central

**Files:** `README.md`, `docs/INTEGRATION_GUIDE.md`, `catalog/modules.json`, `modules/README.md`.

- [ ] Atualizar contagem para 48 upstreams.
- [ ] Documentar separação `projects/` versus `modules/`.
- [ ] Registrar modos `shared`, `snapshot` e `service`.
- [ ] Registrar os 9 módulos e consumidores recomendados.
- [ ] Validar sintaxe JSON e presença de todos os ids.

### Task 2: Manifestos dos módulos

**Files:** `modules/*/module.json`, `modules/*/README.md`.

- [ ] Criar manifestos de QA e segurança.
- [ ] Criar manifestos de documentos, autorização e otimização.
- [ ] Criar manifestos de contratos de API, qualidade de IA e privacidade.
- [ ] Criar manifesto BIM com fronteira explícita para IfcOpenShell.
- [ ] Validar que cada upstream referenciado existe em `catalog/projects.json`.

### Task 3: Verificação antes de promoção

- [ ] Confirmar que nenhum arquivo dentro de `projects/` foi alterado.
- [ ] Confirmar que `catalog/modules.json` contém 9 módulos únicos.
- [ ] Confirmar que todos os `module.json` possuem `id`, `version`, `status`, `consumptionMode`, `upstreams`, `boundary` e `provides`.
- [ ] Revisar diff final antes de merge.
