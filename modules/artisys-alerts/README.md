# ArtiSys Alerts

Módulo transversal local-first para alertas operacionais e notificações internas dos produtos ArtiSys.

- cria alertas ligados a uma entidade (`entityRef`);
- define `dueAt` e severidade `info | warning | critical`;
- lista alertas vencidos/ativos;
- permite reconhecer (`acknowledge`), adiar (`snooze`) e dispensar (`dismiss`);
- cria notificações internas com prioridade `low | normal | high | urgent`;
- controla estado `unread | read`, data e ator da leitura;
- lista notificações não lidas em ordem determinística;
- não exige serviço remoto, daemon ou banco próprio.

Canais de entrega como notificação do sistema operacional, browser, e-mail, SMS ou WhatsApp são adapters opcionais do produto consumidor e nunca dependências obrigatórias do core.

Core R$ 0 / self-hosted / open source.
