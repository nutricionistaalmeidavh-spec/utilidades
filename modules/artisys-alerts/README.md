# ArtiSys Alerts

Módulo transversal local-first para alertas operacionais dos produtos ArtiSys.

- cria alertas ligados a uma entidade (`entityRef`);
- define `dueAt` e severidade `info | warning | critical`;
- lista alertas vencidos/ativos;
- permite reconhecer (`acknowledge`), adiar (`snooze`) e dispensar (`dismiss`);
- não exige serviço remoto, daemon ou banco próprio.

Canais de entrega como notificação do sistema operacional, browser, e-mail ou WhatsApp são adapters opcionais do produto consumidor e nunca dependências obrigatórias do core.

Core R$ 0 / self-hosted / open source.
