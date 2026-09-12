# ArtiSys EventBus

EventBus de domínio reutilizável para sistemas ArtiSys. O core é local-first, self-hosted, MIT e não possui dependências runtime nem serviços pagos obrigatórios.

## O que fornece

- contrato canônico de eventos de domínio;
- `DomainEventBus` síncrono e assíncrono;
- assinatura por tipo e wildcard `*`;
- isolamento de falhas entre subscribers;
- `DomainEventDispatcher` para outbox;
- `IdempotentEffectRunner` para efeitos pós-evento;
- stores em memória;
- adapters SQLite opcionais e schema exportado.

## Instalação/consumo

O módulo pode ser referenciado diretamente a partir do repositório `utilidades` ou incorporado ao workspace do produto. Não há `npm install` de dependências runtime.

```js
const {
  createDomainEvent,
  DomainEventBus,
  MemoryOutboxStore,
  DomainEventDispatcher
} = require('@artisys/eventbus');

const bus = new DomainEventBus();
const outbox = new MemoryOutboxStore();

bus.subscribe('sale.completed', event => {
  console.log(event.payload);
});

outbox.insert(createDomainEvent({
  eventId: 'evt-1',
  type: 'sale.completed',
  aggregate: 'sale',
  aggregateId: 'sale-1',
  source: 'pdv',
  actor: { id: 'operator-1' },
  payload: { total: 100 }
}));

await new DomainEventDispatcher({ bus, outbox }).dispatchPending();
```

## Wildcard

```js
const unsubscribe = bus.subscribe('*', event => {
  console.log(event.type);
});

unsubscribe();
```

Se o mesmo handler estiver inscrito em `*` e no tipo específico, ele é chamado apenas uma vez por publicação.

## Efeitos idempotentes

```js
const { MemoryEffectStore, IdempotentEffectRunner } = require('@artisys/eventbus');

const runner = new IdempotentEffectRunner({
  effectStore: new MemoryEffectStore()
});

bus.subscribe('sale.completed', event => runner.run({
  event,
  effectKey: 'stock.decrement',
  handler: () => baixarEstoque(event)
}));
```

A chave idempotente é `(eventId, effectKey)`. O efeito só é marcado como aplicado depois que o handler termina com sucesso.

## SQLite opcional

O módulo não depende de `better-sqlite3` ou de outra biblioteca. O produto fornece uma conexão compatível com `prepare()`.

```js
const {
  SQLITE_SCHEMA,
  SqliteOutboxStore,
  SqliteEffectStore
} = require('@artisys/eventbus');

db.exec(SQLITE_SCHEMA);
const outbox = new SqliteOutboxStore(db);
const effects = new SqliteEffectStore(db);
```

As tabelas são `domain_events` e `domain_event_effects`, compatíveis com a arquitetura já usada no PDV-ARTISYS.

## Política de custo

O core é R$ 0, self-hosted e open source. Broker externo, SaaS, serviço pago, VPS ou daemon permanente não são necessários. Qualquer integração futura com serviços externos deve permanecer adapter opcional.

## Testes

```bash
npm test
npm run example
```

Os testes usam apenas `node:test`/`node:assert`.
