# ArtiSys EventBus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `modules/artisys-eventbus` como implementação reutilizável do EventBus de domínio, com outbox, idempotência e adapters em memória/SQLite.

**Architecture:** O core é CommonJS e não possui dependências runtime. Persistência é definida por contratos mínimos e adapters separados, permitindo uso puramente em memória ou integração com SQLite já existente no consumidor.

**Tech Stack:** JavaScript CommonJS, Node.js `node:test`, `node:assert/strict`, SQLite por adapter injetado.

**Spec:** `docs/superpowers/specs/2026-09-12-artisys-eventbus-design.md`

## Global Constraints

- Core obrigatório: R$ 0, self-hosted e open source.
- Nenhum serviço pago ou SaaS é dependência obrigatória.
- Nenhuma dependência runtime obrigatória.
- Não alterar consumidores nesta entrega.
- Não acionar CI remoto durante a construção; executar validação local e deixar CI para a entrega final.

---

### Task 1: Contrato de eventos e EventBus

**Files:**
- Create: `modules/artisys-eventbus/src/domain-event.js`
- Create: `modules/artisys-eventbus/src/event-bus.js`
- Create: `modules/artisys-eventbus/tests/event-bus.test.js`

**Interfaces:**
- Produces: `createDomainEvent(input)`, `validateDomainEvent(event)`, `DomainEventBus`.

- [ ] **Step 1: Write failing tests** cobrindo criação/validação, subscribe/unsubscribe, wildcard `*`, sync, async e isolamento de falhas.
- [ ] **Step 2: Run RED** com `node --test tests/event-bus.test.js`; esperado: falha por módulos ainda inexistentes.
- [ ] **Step 3: Implement minimal core** com `Map<string, Set<Function>>`, entrega específica + wildcard sem duplicar handler idêntico inscrito nos dois canais.
- [ ] **Step 4: Run GREEN** com `node --test tests/event-bus.test.js`; esperado: todos passam.

### Task 2: Outbox e dispatcher

**Files:**
- Create: `modules/artisys-eventbus/src/dispatcher.js`
- Create: `modules/artisys-eventbus/src/adapters/memory-outbox.js`
- Create: `modules/artisys-eventbus/tests/dispatcher.test.js`

**Interfaces:**
- Consumes: `bus.publishAsync(event)` ou fallback `bus.publish(event)`.
- Produces: `DomainEventDispatcher`, `MemoryOutboxStore` com `insert`, `listPending`, `markDispatched`, `recordFailure`.

- [ ] **Step 1: Write failing tests** para despacho bem-sucedido, falha persistida, batchSize e reprocessamento pendente.
- [ ] **Step 2: Run RED**; esperado: imports inexistentes.
- [ ] **Step 3: Implement dispatcher e memory outbox** preservando ordem de inserção e estado de despacho/falha.
- [ ] **Step 4: Run GREEN** e regressão do Task 1.

### Task 3: Efeitos idempotentes

**Files:**
- Create: `modules/artisys-eventbus/src/effect-runner.js`
- Create: `modules/artisys-eventbus/src/adapters/memory-effect-store.js`
- Create: `modules/artisys-eventbus/tests/idempotency.test.js`

**Interfaces:**
- Produces: `IdempotentEffectRunner.run({event,effectKey,handler})`, `MemoryEffectStore`.

- [ ] **Step 1: Write failing tests** provando que efeito aplicado não roda novamente e falha não é marcada como aplicada.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement runner/store**.
- [ ] **Step 4: Run GREEN** e regressão completa.

### Task 4: Adapters SQLite

**Files:**
- Create: `modules/artisys-eventbus/src/adapters/sqlite-outbox.js`
- Create: `modules/artisys-eventbus/src/adapters/sqlite-effect-store.js`
- Create: `modules/artisys-eventbus/src/adapters/sqlite-schema.js`
- Create: `modules/artisys-eventbus/tests/sqlite-adapters.test.js`

**Interfaces:**
- Produces: `SqliteOutboxStore`, `SqliteEffectStore`, `SQLITE_SCHEMA`.

- [ ] **Step 1: Write failing tests** com fake DB compatível com `prepare().run/get/all` para validar SQL/argumentos sem dependência nativa.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement adapters** mantendo nomes de tabelas `domain_events` e `domain_event_effects` compatíveis com o PDV.
- [ ] **Step 4: Run GREEN** e regressão completa.

### Task 5: Pacote, documentação e catálogo

**Files:**
- Create: `modules/artisys-eventbus/src/index.js`
- Create: `modules/artisys-eventbus/package.json`
- Create: `modules/artisys-eventbus/module.json`
- Create: `modules/artisys-eventbus/README.md`
- Create: `modules/artisys-eventbus/LICENSE`
- Create: `modules/artisys-eventbus/examples/basic-usage.js`
- Modify: `modules/README.md`

**Interfaces:**
- Produces: pacote `@artisys/eventbus` versão `0.1.0`.

- [ ] **Step 1: Exportar API pública** em `src/index.js`.
- [ ] **Step 2: Criar package/module metadata** com `dependencies: {}` e política de custo zero/self-hosted.
- [ ] **Step 3: Documentar integração** em memória e SQLite, incluindo migration pelo `SQLITE_SCHEMA`.
- [ ] **Step 4: Atualizar catálogo** adicionando `artisys-eventbus 0.1.0 | implemented`.
- [ ] **Step 5: Run final local suite** com `npm test` dentro do módulo; esperado: zero falhas.
- [ ] **Step 6: Revisar diff** garantindo que nenhum consumidor foi alterado e nenhuma dependência paga/externa foi introduzida.
