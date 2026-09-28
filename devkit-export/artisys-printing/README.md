# @artisys/printing

Camada local e reutilizável da ArtiSys para recibos e impressão em aplicações Node/Electron. O consumidor trabalha com um `ReceiptDocument` neutro e escolhe renderer/driver sem acoplar suas regras de negócio ao ReceiptLine, node-thermal-printer ou Electron.

## Escopo

- modelo neutro de recibo;
- renderer texto 32/42/48 colunas;
- ReceiptLine para SVG e comandos de impressora;
- driver de impressora térmica Epson/Star;
- driver Electron injetado como fallback de sistema;
- driver genérico de transporte para serial/TCP/outros transports locais;
- perfis de impressora e resolução explícita de driver.

O módulo não possui fila persistente, regra fiscal ou regra de venda. Essas responsabilidades permanecem no produto consumidor.

## Exemplo — recibo + fallback Electron

```js
const {
  createReceiptDocument,
  renderPlainText,
  createElectronPrinterDriver,
  normalizePrinterProfile
} = require('@artisys/printing');

const document = createReceiptDocument({
  title:'Loja Matriz',
  documentLabel:'CUPOM NAO FISCAL',
  totals:[['TOTAL',1500]],
  payments:[['PIX',1500]],
  footer:['Obrigado pela preferencia']
});
const text = renderPlainText(document);
const driver = createElectronPrinterDriver({ BrowserWindow });
await driver.print({ text, width:document.width }, normalizePrinterProfile({
  id:'principal', mode:'electron', width:42, deviceName:'EPSON TM-T20X', silent:true
}));
```

Electron é fornecido pelo consumidor e não é dependência obrigatória deste pacote.

## Exemplo — térmica

```js
const { createThermalPrinterDriver, normalizePrinterProfile } = require('@artisys/printing');
const driver = createThermalPrinterDriver();
await driver.print(text, normalizePrinterProfile({
  id:'termica', mode:'thermal', width:42,
  printerType:'epson', interface:'tcp://192.168.0.50:9100', cut:true
}));
```

`node-thermal-printer` suporta interfaces como TCP, porta local e impressora de sistema quando há driver apropriado. A compatibilidade real depende do modelo, protocolo e interface instalados.

## Exemplo — transporte serial

```js
const { createTransportPrinterDriver } = require('@artisys/printing');
const { createSerialTransport } = require('@artisys/serialport');

const transport = createSerialTransport({ profile:{ path:'COM5', baudRate:9600 } });
const driver = createTransportPrinterDriver({ transport });
await driver.print(Buffer.from('TESTE\n'), { id:'serial', mode:'transport', width:42 });
```

`@artisys/serialport` é opcional: qualquer transporte compatível com `write()` pode ser fornecido.

## ReceiptLine e preview

```js
const { renderReceiptSvg, renderReceiptLine } = require('@artisys/printing');
const svg = renderReceiptSvg(document);
const escpos = renderReceiptLine(document, { command:'escpos', encoding:'cp860' });
```

QR Code e barcode podem ser descritos em `document.blocks`.

## Falhas

Erros principais: `PRINTER_NOT_CONFIGURED`, `PRINTER_NOT_AVAILABLE`, `PRINTER_UNSUPPORTED`, `PRINTER_RENDER_FAILED`, `PRINTER_WRITE_FAILED` e `PRINTER_TIMEOUT`.

O resolver não faz failover silencioso entre drivers. Se um envio físico falhar, o consumidor decide se deve tentar novamente; isso evita impressão duplicada acidental.

## Testes

```bash
npm test
npm run check
```

A versão 0.1.0 permanece `implemented`; testes físicos de impressora são necessários antes de `stable`.

## Licenças e custo

O código ArtiSys deste módulo é MIT. ReceiptLine 4.0.4 é Apache-2.0. O repositório pinado de node-thermal-printer contém licença MIT; o `package.json` publicado da versão 4.6.1 declara ISC. Essa divergência de metadados do upstream é documentada e deve ser revista em atualizações futuras.

O core funciona localmente com R$ 0 de licença/assinatura e não depende de serviço cloud pago.
