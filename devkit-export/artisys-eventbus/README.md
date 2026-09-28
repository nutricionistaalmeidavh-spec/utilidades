# ArtiSys EventBus

EventBus local-first e sem dependências obrigatórias para Node/Electron, browser/PWA e Cloudflare D1.

## Entradas públicas

- `@artisys/eventbus`: core CommonJS atual para Node/Electron/desktop.
- `@artisys/eventbus/web`: ESM nativo para browser e Cloudflare Workers.

A versão 0.2.0 mantém o core 0.1 compatível e adiciona `WebEventBus`, `BroadcastChannelBridge`, `RemoteEventBridge`, `D1OutboxStore`, `D1EffectStore`, `WebDomainEventDispatcher` e `WebIdempotentEffectRunner`.

## Regra arquitetural

O EventBus do browser nunca é fonte de verdade. Primeiro persista no backend; o evento representa uma alteração que já foi aceita pelo banco. Para D1, prefira `DB.batch()` com o statement de negócio e `outbox.prepareInsert(event)` no mesmo batch.

```js
import { D1OutboxStore, createDomainEvent } from '@artisys/eventbus/web';

const outbox = new D1OutboxStore(env.DB);
const event = createDomainEvent({
  eventId: crypto.randomUUID(),
  type: 'consultation.saved',
  aggregate: 'consultation',
  aggregateId: consultationId,
  source: 'debora-worker',
  actor: { id: userId },
  payload: { patientId }
});

await env.DB.batch([
  env.DB.prepare('UPDATE consultations SET notes = ? WHERE id = ?').bind(notes, consultationId),
  outbox.prepareInsert(event)
]);
```

## Browser/PWA

```js
import { WebEventBus, BroadcastChannelBridge, RemoteEventBridge } from '@artisys/eventbus/web';

const bus = new WebEventBus();
bus.subscribe('patient.updated', refreshPatient);
bus.subscribe('appointment.created', refreshCalendar);
bus.once('document.generated', openDocument);

new BroadcastChannelBridge({ bus, channelName: 'debora-domain-events' }).start();
new RemoteEventBridge({ bus, url: '/api/events', withCredentials: true }).start();
```

`BroadcastChannelBridge` sincroniza abas da mesma origem. `RemoteEventBridge` consome mensagens SSE cujo `data:` contém o envelope de evento em JSON.

## D1

Aplique `migrations/001_eventbus_d1.sql` no banco. O adapter usa apenas a API nativa `prepare/bind/run/all/first` do D1, sem ORM ou pacote adicional.

```bash
wrangler d1 execute <DATABASE> --file=modules/artisys-eventbus/migrations/001_eventbus_d1.sql
```

Falhas de subscribers não marcam o evento como despachado. Uma chamada futura de `dispatchPending()` tenta novamente. Efeitos derivados podem usar `WebIdempotentEffectRunner` + `D1EffectStore` para não aplicar o mesmo efeito duas vezes.

## Exemplo Débora

Fluxo recomendado:

```text
Browser/PWA -> Worker/API -> D1 + domain_events (mesmo batch)
                         -> dispatcher -> efeitos/auditoria/PDF
SSE -> WebEventBus -> UI
BroadcastChannel -> outras abas
```

Eventos típicos: `consultation.saved`, `patient.updated`, `appointment.created`, `document.generated`.

## Custos e infraestrutura

O core custa R$ 0 e não exige servidor dedicado, broker, SaaS, Kafka, RabbitMQ ou Redis. D1/SSE são integrações opcionais do produto consumidor. WebSocket, Durable Objects e filas permanecem extensões futuras e não dependências silenciosas.
