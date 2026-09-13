# ArtiSys Alerts

Módulo transversal local-first para alertas operacionais dos produtos ArtiSys.

## Escopo

- cria alertas ligados a uma entidade (`entityRef`);
- define `dueAt` e severidade `info | warning | critical`;
- lista alertas vencidos/ativos;
- permite reconhecer (`acknowledge`), adiar (`snooze`) e dispensar (`dismiss`);
- não exige serviço remoto, daemon ou banco próprio.

Canais de entrega como notificação do sistema operacional, browser, e-mail ou WhatsApp são adapters opcionais do produto consumidor e nunca dependências obrigatórias do core.

## Exemplo

```js
import { createAlert, listDueAlerts } from '@artisys/alerts';

const alert = createAlert({
  id: 'ca-123',
  entityRef: { kind: 'epi-ca', id: '123' },
  title: 'CA próximo do vencimento',
  dueAt: '2026-10-01T12:00:00Z',
  severity: 'warning',
});

console.log(listDueAlerts([alert], { now: '2026-10-02T12:00:00Z' }));
```

## Política

Core R$ 0 / self-hosted / open source. Nenhum canal pago é obrigatório.
