# `artisys-whatsapp-launcher`

Módulo reutilizável e local para abrir o WhatsApp Web dentro de um aplicativo Electron, manter a sessão em partição persistente, abrir conversas por telefone e pré-preencher mensagens a partir de templates editáveis com variáveis.

## Escopo entregue

1. módulo standalone;
2. adapter para `WebContentsView` do Electron;
3. sessão persistente local via partição `persist:*`;
4. abertura de conversa por número;
5. mensagem pré-preenchida, sem autoenvio;
6. templates locais editáveis em JSON;
7. variáveis dinâmicas no formato `{nome}`, `{valor}`, `{data}` etc.

## Regra de integração

Este módulo **não deve ser integrado a nenhum produto consumidor sem autorização explícita do usuário responsável pelo repositório**. O catálogo mantém `recommendedConsumers: []` de propósito.

## Core R$ 0

- sem API paga obrigatória;
- sem SaaS intermediário;
- sem servidor próprio obrigatório;
- armazenamento de templates no filesystem local;
- Electron é fornecido pelo aplicativo host, sem dependência acoplada ao pacote;
- WhatsApp Business/API pode existir futuramente apenas como adapter opcional e explícito.

## Uso do core

```js
import { buildWhatsAppWebUrl, createTemplateStore } from '@artisys/whatsapp-launcher';

const store = createTemplateStore({ filePath: '/dados/meu-app/whatsapp-templates.json' });
await store.upsert({ id: 'orcamento', name: 'Orçamento', text: 'Boa tarde, {nome}. Seu orçamento ficou em {valor}.' });
const message = await store.render('orcamento', { nome: 'João', valor: 'R$ 350,00' });
const url = buildWhatsAppWebUrl({ phone: '(16) 99999-9999', message });
```

## Adapter Electron

```js
import { WebContentsView } from 'electron';
import { createWhatsAppWebController, persistentPartition } from '@artisys/whatsapp-launcher';

const whatsapp = createWhatsAppWebController({
  WebContentsView,
  parentWindow: mainWindow,
  partition: persistentPartition('minha-empresa')
});

whatsapp.setBounds({ x: 240, y: 0, width: 1000, height: 760 });
await whatsapp.openHome();
await whatsapp.openChat({ phone: '16999999999', message: 'Boa tarde, João. Seu orçamento está pronto.' });
```

O controller cria o `WebContentsView` com `nodeIntegration: false`, `contextIsolation: true` e `sandbox: true`. A partição `persist:*` permite que cookies e dados do login do WhatsApp Web sobrevivam ao reinício do aplicativo.

## Templates e variáveis

Os templates ficam em JSON local. `renderTemplate()` usa modo estrito por padrão: se uma variável não for fornecida, a renderização falha em vez de preparar texto incompleto por engano.

## Segurança e limite funcional

O módulo não automatiza cliques, não dispara mensagens, não lê o conteúdo das conversas e não tenta contornar controles do WhatsApp. Ele abre o WhatsApp Web e prepara a conversa/mensagem para revisão e envio manual pelo usuário.
