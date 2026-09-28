# @artisys/serialport

Camada local e reutilizável da ArtiSys para comunicação serial em aplicações Node/Electron. O módulo encapsula `serialport` atrás de contratos próprios para que produtos não espalhem dependências do upstream pelo domínio.

## Escopo

- descoberta de portas;
- transporte serial com estados e erros normalizados;
- sessões request/response com timeout;
- parser numérico de peso;
- buffer de linhas;
- adapter de balança;
- adapter de gaveta de dinheiro;
- dispositivo serial genérico.

O core funciona localmente, sem servidor externo, conta cloud ou serviço pago obrigatório.

## Instalação

Em um consumidor ArtiSys, prefira a versão pinada do repositório `utilidades`:

```json
{
  "dependencies": {
    "@artisys/serialport": "file:vendor/utilidades/modules/artisys-serialport"
  }
}
```

O pacote usa `serialport` 13.0.0 e requer Node.js 22 ou superior.

## Exemplo — balança

```js
const {
  createSerialTransport,
  createRequestResponseSession,
  createScaleAdapter,
  parseNumericWeight
} = require('@artisys/serialport');

const profile = { path:'COM3', baudRate:9600 };
const transport = createSerialTransport({ profile });
const session = createRequestResponseSession({
  transport,
  request:'P',
  timeoutMs:1500,
  parse:buffer => String(buffer).includes('kg') ? parseNumericWeight(buffer) : undefined
});
const scale = createScaleAdapter({ session, profile });
const result = await scale.readWeight();
```

Exemplos de caminhos: Windows `COM3`; Linux `/dev/ttyUSB0`; macOS `/dev/tty.usbserial-*`. O caminho correto e o protocolo dependem do equipamento e do driver instalado.

## Exemplo — gaveta serial

```js
const { createSerialTransport, createDrawerAdapter } = require('@artisys/serialport');

const transport = createSerialTransport({ profile:{ path:'COM4', baudRate:9600 } });
const drawer = createDrawerAdapter({ transport });
await drawer.open();
```

O pulso padrão é ESC/POS `1B 70 00 19 FA`, mas pode ser substituído na criação do adapter.

## API pública

`createSerialPortManager`, `createSerialTransport`, `createRequestResponseSession`, `createScaleAdapter`, `createDrawerAdapter`, `createGenericSerialDevice`, `parseNumericWeight`, `createLineBuffer`, `normalizeDeviceProfile`, `SerialError` e `normalizeSerialError`.

## Erros estáveis

O módulo normaliza situações principais para `SERIAL_PORT_NOT_FOUND`, `SERIAL_PORT_BUSY`, `SERIAL_OPEN_FAILED`, `SERIAL_WRITE_FAILED`, `SERIAL_TIMEOUT`, `SERIAL_PARSE_FAILED` e `SERIAL_DISCONNECTED`.

## Testes

```bash
npm test
npm run check
```

Os testes unitários usam portas falsas e não exigem hardware físico. A versão 0.1.0 permanece com status `implemented`; validação em equipamentos reais é necessária antes de promover para `stable`.

## Licença e custo

O código ArtiSys deste módulo é MIT. O upstream Node SerialPort também é MIT. O funcionamento obrigatório não depende de assinatura, API comercial ou infraestrutura always-on.
