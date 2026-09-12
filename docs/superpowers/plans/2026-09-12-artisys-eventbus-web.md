# ArtiSys EventBus Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar browser/PWA, D1 e SSE ao `artisys-eventbus` sem quebrar consumidores Node/Electron.

**Architecture:** Preservar o core CommonJS e adicionar um subpath ESM `./web`. D1 implementa o mesmo contrato de outbox/effect store e o browser recebe eventos remotos por SSE e entre abas por BroadcastChannel.

**Tech Stack:** Node 18+, native ESM, Web APIs, Cloudflare D1 API, node:test.

**Spec:** `docs/superpowers/specs/2026-09-12-artisys-eventbus-web-design.md`

## Global Constraints
- Zero dependências runtime obrigatórias.
- Não transformar browser em fonte de verdade.
- Manter compatibilidade do export principal CommonJS.
- CI somente na entrega final em `main`.

### Task 1: Web EventBus
- [x] Criar testes RED para wildcard, falhas e `once()`.
- [x] Implementar `WebEventBus` e envelope ESM.
- [x] Verificar testes GREEN.

### Task 2: Browser bridges
- [x] Criar testes RED para BroadcastChannel e SSE.
- [x] Implementar bridges com prevenção de eco local.
- [x] Verificar testes GREEN.

### Task 3: Cloudflare D1
- [x] Criar testes RED para outbox, retry, efeitos e schema.
- [x] Implementar adapters D1 e `prepareInsert()` para `DB.batch()`.
- [x] Verificar testes GREEN.

### Task 4: Dispatcher, packaging e docs
- [x] Implementar dispatcher/idempotência ESM.
- [x] Expor `./web`, migration D1 e exemplo tipo Débora.
- [x] Rodar testes novos, syntax check, exemplo e pack local.
- [x] Atualizar catálogo/README central e entregar em `main`.
