# ArtiSys EventBus Web Design

## Objetivo
Evoluir o EventBus compartilhado para apps web/PWA sem quebrar Node/Electron, mantendo o banco como fonte de verdade e zero dependências runtime obrigatórias.

## Arquitetura
- Core CommonJS existente permanece inalterado.
- Novo subpath ESM `@artisys/eventbus/web` para browser e Cloudflare Workers.
- Browser: `WebEventBus`, wildcard, `once`, BroadcastChannel e SSE.
- Backend Cloudflare: D1 outbox + effect store + dispatcher/idempotência ESM.
- D1 suporta `prepareInsert()` para atomicidade com `DB.batch()`.

## Não objetivos
Não incluir broker externo, WebSocket obrigatório, Durable Objects obrigatório ou estado autoritativo no browser.
