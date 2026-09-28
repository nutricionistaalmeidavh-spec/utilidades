'use strict';

const {
  createDomainEvent,
  DomainEventBus,
  DomainEventDispatcher,
  MemoryOutboxStore,
  MemoryEffectStore,
  IdempotentEffectRunner
} = require('../src');

async function main() {
  const bus = new DomainEventBus();
  const outbox = new MemoryOutboxStore();
  const effects = new MemoryEffectStore();
  const effectRunner = new IdempotentEffectRunner({ effectStore: effects });

  bus.subscribe('sale.completed', async event => {
    await effectRunner.run({
      event,
      effectKey: 'stock.decrement',
      handler: () => console.log(`Baixa de estoque para ${event.aggregateId}`)
    });
  });

  bus.subscribe('*', event => console.log(`Evento observado: ${event.type}`));

  const event = createDomainEvent({
    eventId: 'evt-demo-1',
    type: 'sale.completed',
    aggregate: 'sale',
    aggregateId: 'sale-100',
    source: 'demo',
    actor: { id: 'operator-1' },
    payload: { total: 39.9 }
  });

  outbox.insert(event);
  const dispatcher = new DomainEventDispatcher({ bus, outbox });
  console.log(await dispatcher.dispatchPending());
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
