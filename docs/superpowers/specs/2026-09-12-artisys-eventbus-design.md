# ArtiSys EventBus Design

## Objetivo

Extrair o EventBus de domínio já usado no PDV-ARTISYS e consolidar uma implementação reutilizável em `modules/artisys-eventbus`, adequada para aplicações Node/Electron/local-first da ArtiSys.

## Escopo

O módulo fornece EventBus síncrono e assíncrono, validação/criação de eventos canônicos, wildcard `*`, dispatcher de outbox, execução idempotente de efeitos, stores em memória e adapters SQLite opcionais. Ele não contém regras de negócio de nenhum produto.

## Restrições globais

- Core obrigatório: R$ 0, self-hosted e open source.
- Nenhum SaaS, broker, daemon, VPS, runner permanente ou serviço pago é requisito.
- Nenhuma dependência runtime obrigatória.
- SQLite é adapter opcional por injeção de conexão compatível com `prepare()`.
- CommonJS para integração direta com PDV-ARTISYS e Electron existentes.
- Alterações em consumidores ficam fora desta entrega; o módulo nasce pronto para migração gradual sem quebrar os produtos atuais.

## API pública

`DomainEventBus`
- `subscribe(type, handler) -> unsubscribe()`
- `publish(event) -> deliveryResult`
- `publishAsync(event) -> Promise<deliveryResult>`
- `clear(type?)`
- `subscriberCount(type)`
- assinatura `*` recebe todo evento.

Eventos canônicos possuem `eventId`, `type`, `aggregate`, `aggregateId`, `occurredAt`, `source`, `actor`, `payload` e `mutationId` opcional. `createDomainEvent()` cria o envelope e `validateDomainEvent()` valida envelopes existentes.

`DomainEventDispatcher`
- recebe `{ bus, outbox, batchSize }`;
- lê `outbox.listPending(limit)`;
- publica de forma assíncrona quando disponível;
- só marca como despachado quando nenhum handler falha;
- persiste falhas com `recordFailure(eventId, message)`.

`IdempotentEffectRunner`
- recebe `effectStore` com `hasApplied(eventId, effectKey)` e `markApplied(effect)`;
- não executa novamente um efeito já aplicado;
- só grava aplicação após sucesso do handler.

## Adapters

`MemoryOutboxStore` e `MemoryEffectStore` permitem testes e sistemas sem banco.

`SqliteOutboxStore` e `SqliteEffectStore` recebem a conexão do consumidor. O módulo não instala nem exige `better-sqlite3`.

O consumidor cria suas tabelas através de `SQLITE_SCHEMA`, exportado pelo módulo, podendo incorporá-lo à migration existente.

## Tratamento de erros

Falha de um subscriber não interrompe a entrega aos demais subscribers do mesmo evento. O resultado contém `failures`. No dispatcher, qualquer failure impede `markDispatched` e é persistida na outbox.

## Testes

Os testes usam apenas `node:test` e `node:assert/strict`. Devem cobrir validação, wildcard, sync/async, isolamento de falhas, unsubscribe, memória, dispatcher, idempotência e adapters SQLite via conexão fake compatível com a interface mínima.

## Distribuição

O módulo fica em `modules/artisys-eventbus`, versão inicial `0.1.0`, estado `implemented`, com `package.json`, `module.json`, `README.md`, `LICENSE`, `src/`, `tests/` e `examples/`. O índice de `modules/README.md` será atualizado na mesma entrega.
