# Design — ArtiSys Printing + ArtiSys SerialPort

Data: 2026-09-10

## Objetivo

Criar dois módulos reutilizáveis, locais e sem custo obrigatório para a plataforma ArtiSys:

1. `@artisys/serialport` — camada estável de comunicação serial para dispositivos físicos.
2. `@artisys/printing` — camada estável de renderização e impressão de documentos térmicos, com suporte a impressoras ESC/POS e fallback de impressão do Electron/Windows.

Os dois módulos devem ser consumidos inicialmente pelo `PDV-ARTISYS`, substituindo a lógica duplicada atualmente existente no `desktop/hardware-bridge.cjs`, sem alterar as regras de negócio de venda, fila de impressão, caixa ou estoque.

## Restrições obrigatórias

- Core com R$ 0 de licença/assinatura.
- Execução local/self-hosted.
- Nenhum servidor, daemon, banco dedicado, VPS ou serviço cloud obrigatório.
- Serviços pagos podem existir apenas como alternativa explícita e substituível; esta implementação não exige nenhum.
- Upstreams permanecem isolados atrás de contratos ArtiSys.
- O produto consumidor não deve espalhar imports específicos de `serialport`, `receiptline` ou `node-thermal-printer` pelo domínio.
- O `Electron Print` atual deve permanecer disponível como fallback.

## Upstreams

### `serialport/node-serialport`

Uso: acesso a portas seriais em Windows, Linux e macOS.

Licença: MIT.

Papel: upstream principal do `@artisys/serialport`.

### `receiptline/receiptline`

Uso: representação/renderização de recibos, preview e geração de comandos compatíveis com impressoras térmicas.

Licença: Apache-2.0.

Papel: renderer opcional do `@artisys/printing`.

### `Klemen1337/node-thermal-printer`

Uso: comandos de impressão para impressoras térmicas Epson/Star e compatíveis.

Licença: MIT.

Papel: driver opcional do `@artisys/printing`.

## Arquitetura geral

```text
PDV-ARTISYS
│
├─ domínio de venda / caixa / impressão
│   └─ mantém fila existente: PENDING / PRINTED / FAILED / CANCELLED
│
├─ @artisys/printing
│   ├─ ReceiptDocument
│   ├─ PlainTextRenderer
│   ├─ ReceiptLineRenderer
│   ├─ ThermalPrinterDriver
│   ├─ ElectronPrinterDriver
│   └─ PrinterProfile
│
└─ @artisys/serialport
    ├─ SerialPortManager
    ├─ SerialTransport
    ├─ RequestResponseSession
    ├─ ScaleAdapter
    ├─ DrawerAdapter
    └─ GenericSerialDevice
         ↓
     node-serialport
```

A relação entre os módulos é opcional: `@artisys/printing` pode usar um transporte serial fornecido pelo consumidor, mas não deve depender obrigatoriamente de `@artisys/serialport` para funcionar. Isso preserva uso via USB, TCP ou spooler do sistema operacional.

## Módulo `@artisys/serialport`

### Responsabilidade

Fornecer uma API estável para portas seriais e padrões comuns de interação com hardware, sem expor `node-serialport` diretamente ao produto consumidor.

### Estrutura proposta

```text
modules/artisys-serialport/
├─ module.json
├─ package.json
├─ README.md
├─ LICENSE
├─ src/
│  ├─ index.js
│  ├─ serial-port-manager.js
│  ├─ serial-transport.js
│  ├─ request-response-session.js
│  ├─ device-profile.js
│  ├─ parsers/
│  │  ├─ numeric-weight.js
│  │  └─ line-buffer.js
│  └─ adapters/
│     ├─ scale.js
│     ├─ drawer.js
│     └─ generic-device.js
└─ tests/
   ├─ serial-port-manager.test.js
   ├─ request-response-session.test.js
   ├─ scale.test.js
   └─ drawer.test.js
```

### API pública mínima

```js
createSerialPortManager(options)
createSerialTransport(options)
createRequestResponseSession(options)
createScaleAdapter(options)
createDrawerAdapter(options)
parseNumericWeight(input)
```

### `SerialPortManager`

Responsável por:

- listar portas disponíveis;
- abrir porta com configuração explícita;
- validar baud rate, data bits, stop bits e parity;
- fechar a porta com segurança;
- garantir que duas aberturas concorrentes da mesma instância não criem estado inconsistente;
- expor estado `closed`, `opening`, `open`, `closing`, `error`;
- propagar erros normalizados.

### `SerialTransport`

Contrato genérico:

```js
{
  open(),
  close(),
  write(data),
  drain(),
  onData(handler),
  status()
}
```

Consumidores podem trocar o backend no futuro sem mudar as regras de negócio.

### `RequestResponseSession`

Resolve o padrão frequente de hardware:

```text
abrir porta
→ enviar comando opcional
→ acumular bytes
→ detectar resposta válida
→ timeout
→ fechar porta
```

Parâmetros:

- `request`
- `timeoutMs`
- `parse`
- `terminator` opcional
- `closeAfterResponse` padrão `true`

### `ScaleAdapter`

Contrato:

```js
{
  status(),
  readWeight(),
  tare?()
}
```

Regras:

- retorna kg normalizado;
- recusa NaN, infinito e valor negativo;
- arredonda para até três casas decimais por padrão;
- parser pode ser substituído por modelo de balança.

### `DrawerAdapter`

Contrato:

```js
{
  status(),
  open()
}
```

O pulso ESC/POS padrão pode ser configurado, sem fixar o módulo a um único modelo.

## Módulo `@artisys/printing`

### Responsabilidade

Fornecer modelo de documento, renderização e drivers de impressão, sem assumir regras de venda ou fiscalidade do consumidor.

### Estrutura proposta

```text
modules/artisys-printing/
├─ module.json
├─ package.json
├─ README.md
├─ LICENSE
├─ src/
│  ├─ index.js
│  ├─ receipt-document.js
│  ├─ printer-profile.js
│  ├─ print-result.js
│  ├─ renderers/
│  │  ├─ plain-text.js
│  │  └─ receiptline.js
│  └─ drivers/
│     ├─ thermal-printer.js
│     ├─ electron-printer.js
│     └─ transport-printer.js
└─ tests/
   ├─ receipt-document.test.js
   ├─ plain-text.test.js
   ├─ receiptline.test.js
   ├─ thermal-printer.test.js
   └─ printer-profile.test.js
```

### `ReceiptDocument`

Formato ArtiSys independente do upstream.

Exemplo conceitual:

```js
{
  width: 42,
  title: 'Loja Matriz',
  documentLabel: 'CUPOM NAO FISCAL',
  metadata: [
    ['Venda', '000123'],
    ['Operador', 'Victor']
  ],
  items: [
    {
      name: 'Produto A',
      quantity: 2,
      unitPriceCents: 1500,
      totalCents: 3000
    }
  ],
  totals: [
    ['Subtotal', 3000],
    ['TOTAL', 3000]
  ],
  payments: [
    ['PIX', 3000]
  ],
  footer: ['Obrigado pela preferencia']
}
```

Esse formato permite que o PDV converta a venda uma única vez e escolha o renderer/driver depois.

### Renderers

#### PlainTextRenderer

Mantém compatibilidade com a saída atual de 32/42/48 colunas.

Usos:

- fallback;
- testes snapshot;
- Electron Print;
- impressoras genéricas.

#### ReceiptLineRenderer

Converte `ReceiptDocument` para a sintaxe/saída do ReceiptLine.

Usos:

- preview SVG;
- comandos ESC/POS/StarPRNT quando compatíveis;
- QR Code e barcode;
- layout mais rico sem acoplar o PDV ao ReceiptLine.

### `PrinterProfile`

Configuração local do dispositivo:

```js
{
  id: 'caixa-01-printer',
  mode: 'thermal' | 'electron' | 'transport',
  width: 42,
  printerType: 'epson' | 'star' | 'generic',
  interface: 'printer:EPSON' | 'tcp://...' | null,
  deviceName: 'EPSON TM-T20X',
  silent: true,
  cut: true,
  openDrawerAfterPrint: false
}
```

Validação deve rejeitar configurações incoerentes antes da impressão.

### Drivers

#### ThermalPrinterDriver

Adapter sobre `node-thermal-printer`.

Contrato:

```js
{
  status(),
  print(renderedDocument, profile)
}
```

Retorno normalizado:

```js
{
  success: true,
  driver: 'thermal',
  device: '...',
  printedAt: '...'
}
```

Falhas retornam erro normalizado; o driver não altera a fila do PDV.

#### ElectronPrinterDriver

Move a implementação genérica hoje existente em `desktop/hardware-bridge.cjs` para uma fronteira reutilizável.

O consumidor fornece `BrowserWindow`; o módulo não importa Electron obrigatoriamente.

Isso evita que o pacote inteiro dependa de Electron quando usado por outro produto Node.

#### TransportPrinterDriver

Driver simples que recebe um transporte com `write()`/`drain()` e envia bytes já renderizados.

Pode ser conectado ao `@artisys/serialport`, TCP ou outro transporte local.

## Integração no `PDV-ARTISYS`

### Código que permanece no PDV

- `js/domains/printing/print-service.js` e sua fila persistente;
- regras de reprint;
- estados de job;
- associação entre venda e impressão;
- configuração de loja;
- decisões de quando imprimir;
- segurança IPC;
- variáveis de ambiente/deployment do produto.

### Código que deve sair do `hardware-bridge.cjs`

- implementação direta de balança serial;
- implementação direta de gaveta serial;
- implementação concreta do Electron Print.

O arquivo passa a coordenar adapters, não implementar protocolos.

### Novo fluxo de hardware

```text
main.cjs
  ↓
buildHardwareController()
  ├─ @artisys/serialport → scale adapter
  ├─ @artisys/serialport → drawer adapter
  └─ @artisys/printing   → printer driver
```

### Novo fluxo de impressão

```text
Venda concluída
  ↓
PDV cria ReceiptDocument
  ↓
print-service cria job persistente
  ↓
worker busca PENDING
  ↓
resolver seleciona PrinterProfile
  ↓
@artisys/printing
  ├─ thermal → node-thermal-printer
  ├─ transport → serial/TCP
  └─ electron → fallback atual
  ↓
print-service marca PRINTED ou FAILED
```

### Compatibilidade retroativa

Sem configuração nova, o PDV deve continuar usando o comportamento atual:

```text
mode = electron
width = PDV_RECEIPT_WIDTH || 42
printerName = PDV_PRINTER_NAME
silent = PDV_PRINT_SILENT === 'true'
```

Portanto uma atualização do PDV não quebra instalações atuais.

### Configuração proposta no PDV

Variáveis existentes permanecem válidas.

Novas variáveis opcionais:

```text
PDV_PRINTER_MODE=electron|thermal|serial
PDV_PRINTER_TYPE=epson|star|generic
PDV_PRINTER_INTERFACE=...
PDV_PRINTER_CUT=true|false

PDV_SCALE_PORT=COM3
PDV_SCALE_BAUD=9600
PDV_SCALE_COMMAND=...

PDV_DRAWER_PORT=COM4
PDV_DRAWER_BAUD=9600
```

No futuro isso pode migrar para UI de configuração, mas não faz parte deste escopo.

## Consumo entre repositórios

O repositório `utilidades` permanece fonte canônica.

Para o `PDV-ARTISYS`, o primeiro caminho recomendado é dependência Git/local pinada, sem publicar pacote em registry pago.

Objetivos:

- nenhuma cópia divergente;
- versão explícita;
- build reproduzível;
- core sem serviço externo em runtime.

O mecanismo exato de pin deve ser escolhido na implementação conforme a forma mais segura suportada pelo Electron Builder e pelo GitHub privado do consumidor.

## Catálogo `utilidades`

Adicionar três upstreams aprovados em `projects/`/`.gitmodules`/`catalog/projects.json`:

- `node-serialport`
- `receiptline`
- `node-thermal-printer`

Adicionar dois módulos em `catalog/modules.json`:

- `artisys-serialport`
- `artisys-printing`

Versão inicial proposta: `0.1.0` com status `implemented`; promover para `stable` somente após validação física em pelo menos uma balança e uma impressora real.

## Tratamento de erros

### Serial

Normalizar pelo menos:

- `SERIAL_PORT_NOT_FOUND`
- `SERIAL_PORT_BUSY`
- `SERIAL_OPEN_FAILED`
- `SERIAL_WRITE_FAILED`
- `SERIAL_TIMEOUT`
- `SERIAL_PARSE_FAILED`
- `SERIAL_DISCONNECTED`

### Printing

Normalizar pelo menos:

- `PRINTER_NOT_CONFIGURED`
- `PRINTER_NOT_AVAILABLE`
- `PRINTER_UNSUPPORTED`
- `PRINTER_RENDER_FAILED`
- `PRINTER_WRITE_FAILED`
- `PRINTER_TIMEOUT`

O módulo retorna erro; o PDV continua responsável por converter isso para `FAILED` na fila.

## Testes

### `@artisys/serialport`

Unit tests com fake `SerialPortClass` para:

- abrir/fechar;
- escrita e drain;
- timeout;
- resposta fragmentada em vários chunks;
- parser inválido;
- porta inexistente;
- erro durante escrita;
- leitura de balança;
- pulso de gaveta;
- fechamento mesmo após erro.

Nenhum teste unitário exige hardware físico.

### `@artisys/printing`

Unit tests para:

- documento 32/42/48 colunas;
- dinheiro em centavos;
- truncamento/alinhamento;
- múltiplos pagamentos;
- desconto/troco;
- QR/barcode no renderer ReceiptLine;
- perfil inválido;
- thermal driver com upstream mockado;
- fallback Electron com BrowserWindow mockado.

### `PDV-ARTISYS`

Adicionar testes de integração para:

- hardware controller usando adapters;
- impressão electron default sem nova configuração;
- seleção de driver por profile;
- falha do driver → job `FAILED`;
- retry → nova tentativa;
- reprint preservado;
- balança retornando kg;
- gaveta disparando pulse;
- aplicação iniciando quando `serialport` não consegue carregar;
- build Electron incluindo módulos nativos necessários.

### Validação física

Antes de `stable`, executar smoke test manual em:

1. uma impressora térmica ESC/POS real;
2. uma balança serial real ou simulador serial confiável;
3. abertura de gaveta, se houver hardware disponível;
4. fallback por driver Windows.

## Estratégia de rollout

### Etapa 1

Criar e testar `@artisys/serialport` isoladamente.

### Etapa 2

Criar e testar `@artisys/printing` isoladamente.

### Etapa 3

Registrar upstreams e módulos no `utilidades`.

### Etapa 4

Integrar `@artisys/serialport` ao PDV para balança/gaveta mantendo comportamento atual.

### Etapa 5

Integrar `@artisys/printing` ao PDV mantendo `electron` como default.

### Etapa 6

Habilitar `thermal`/`serial` apenas quando explicitamente configurado.

### Etapa 7

Executar suíte completa e build Windows.

## Critérios de aceite

A implementação será considerada pronta quando:

- os dois módulos tiverem API pública documentada;
- os três upstreams estiverem catalogados e com licenças registradas;
- não houver serviço pago ou always-on obrigatório;
- o PDV não importar `serialport`, `receiptline` ou `node-thermal-printer` diretamente fora da camada de integração;
- balança e gaveta do PDV passarem pelo `@artisys/serialport`;
- impressão passar pelo `@artisys/printing`;
- o modo Electron atual continuar funcionando sem nova configuração;
- o modo térmico puder ser ativado por configuração explícita;
- fila, retry e reprint existentes continuarem funcionais;
- testes dos módulos e do PDV passarem;
- build Windows incluir corretamente dependências nativas;
- documentação indicar limitações e necessidade de validação física antes de marcar suporte a um modelo específico como garantido.

## Fora de escopo

- emissão fiscal/NFC-e;
- integração TEF;
- descoberta automática perfeita de modelo de impressora;
- UI gráfica completa de configuração de hardware;
- drivers proprietários de fabricantes;
- serviço cloud de impressão;
- suporte garantido a qualquer impressora sem teste físico.

## Decisões finais

1. Dois módulos separados são preferidos a um `artisys-hardware` monolítico.
2. `@artisys/serialport` é a camada canônica para comunicação serial.
3. `@artisys/printing` é a camada canônica para documentos e impressão.
4. Dependência entre os dois módulos é opcional e por contrato de transporte.
5. O PDV mantém regras de negócio, fila e estados de impressão.
6. Electron Print permanece fallback e comportamento padrão inicial.
7. Thermal/Serial só entram em operação quando explicitamente configurados.
8. O core continua local, open source e com custo obrigatório R$ 0.
