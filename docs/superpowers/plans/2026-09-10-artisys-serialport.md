# ArtiSys SerialPort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@artisys/serialport` as the reusable ArtiSys hardware-communication module that wraps Node SerialPort behind stable local contracts for ports, request/response sessions, scales, drawers and generic serial devices.

**Architecture:** The module is CommonJS-first because its first consumer, `PDV-ARTISYS`, uses `require()`. `serialport@13.0.0` is the only runtime dependency. All hardware-specific behavior is injected through profiles/adapters, and tests use a fake `SerialPortClass`, so unit tests do not require physical hardware.

**Tech Stack:** Node.js >=22, CommonJS, Node built-in test runner, `serialport@13.0.0`.

**Spec:** `docs/superpowers/specs/2026-09-10-artisys-printing-serialport-design.md`

## Global Constraints

- Core must work with R$ 0 license/subscription cost.
- Execution is local/self-hosted; no required cloud API, server, daemon, VPS, dedicated database, or always-on process.
- `serialport` is isolated behind ArtiSys contracts; consumers do not import it in domain code.
- Node version floor is `>=22`.
- Initial module version is `0.1.0`, status `implemented`; do not mark `stable` before physical validation on real hardware.
- Current `utilidades` main already contains `projects/hardware/node-serialport` in `.gitmodules` and `catalog/projects.json`; do not duplicate that upstream registration.
- Errors must be normalized to stable codes: `SERIAL_PORT_NOT_FOUND`, `SERIAL_PORT_BUSY`, `SERIAL_OPEN_FAILED`, `SERIAL_WRITE_FAILED`, `SERIAL_TIMEOUT`, `SERIAL_PARSE_FAILED`, `SERIAL_DISCONNECTED`.

---

### Task 1: Package contract, validation and normalized errors

**Files:**
- Create: `modules/artisys-serialport/package.json`
- Create: `modules/artisys-serialport/module.json`
- Create: `modules/artisys-serialport/src/errors.js`
- Create: `modules/artisys-serialport/src/device-profile.js`
- Create: `modules/artisys-serialport/src/index.js`
- Create: `modules/artisys-serialport/tests/device-profile.test.js`

**Interfaces:**
- Consumes: Node `Error` and plain profile objects.
- Produces: `SerialError`, `normalizeSerialError(error, fallbackCode)`, `normalizeDeviceProfile(input)`, and package exports from `src/index.js`.

- [ ] **Step 1: Write failing validation/error tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDeviceProfile, SerialError } = require('../src');

test('normalizes a serial device profile', () => {
  assert.deepEqual(normalizeDeviceProfile({ path:'COM3', baudRate:9600 }), {
    path:'COM3', baudRate:9600, dataBits:8, stopBits:1, parity:'none'
  });
});

test('rejects missing path with stable code', () => {
  assert.throws(() => normalizeDeviceProfile({ baudRate:9600 }), error => {
    assert.equal(error instanceof SerialError, true);
    assert.equal(error.code, 'SERIAL_PORT_NOT_FOUND');
    return true;
  });
});
```

- [ ] **Step 2: Run the test and confirm red**

Run: `cd modules/artisys-serialport && node --test tests/device-profile.test.js`

Expected: FAIL because `../src` does not exist yet.

- [ ] **Step 3: Implement stable errors and profile validation**

`src/errors.js`:

```js
'use strict';
class SerialError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'SerialError';
    this.code = code;
  }
}
function normalizeSerialError(error, fallbackCode = 'SERIAL_DISCONNECTED') {
  if (error instanceof SerialError) return error;
  const message = error?.message || String(error || 'Serial error');
  return new SerialError(fallbackCode, message, { cause:error instanceof Error ? error : undefined });
}
module.exports = { SerialError, normalizeSerialError };
```

`src/device-profile.js`:

```js
'use strict';
const { SerialError } = require('./errors');
const PARITY = new Set(['none','even','odd','mark','space']);
function normalizeDeviceProfile(input = {}) {
  const path = String(input.path || '').trim();
  if (!path) throw new SerialError('SERIAL_PORT_NOT_FOUND', 'Porta serial nao configurada.');
  const baudRate = Number(input.baudRate ?? 9600);
  const dataBits = Number(input.dataBits ?? 8);
  const stopBits = Number(input.stopBits ?? 1);
  const parity = String(input.parity || 'none').toLowerCase();
  if (!Number.isInteger(baudRate) || baudRate <= 0) throw new TypeError('baudRate invalido.');
  if (![5,6,7,8].includes(dataBits)) throw new TypeError('dataBits invalido.');
  if (![1,1.5,2].includes(stopBits)) throw new TypeError('stopBits invalido.');
  if (!PARITY.has(parity)) throw new TypeError('parity invalido.');
  return Object.freeze({ path, baudRate, dataBits, stopBits, parity });
}
module.exports = { normalizeDeviceProfile };
```

`src/index.js` initially exports these symbols.

- [ ] **Step 4: Add package metadata**

`package.json` must contain exactly the runtime dependency needed by this module:

```json
{
  "name": "@artisys/serialport",
  "version": "0.1.0",
  "type": "commonjs",
  "main": "./src/index.js",
  "exports": { ".": "./src/index.js" },
  "engines": { "node": ">=22" },
  "files": ["src", "README.md", "module.json", "LICENSE"],
  "scripts": { "test": "node --test tests/*.test.js", "check": "node --check src/*.js src/adapters/*.js src/parsers/*.js" },
  "dependencies": { "serialport": "13.0.0" },
  "license": "MIT"
}
```

`module.json` must record `id: artisys-serialport`, version `0.1.0`, status `implemented`, consumption mode `shared`, upstream `node-serialport`, execution mode `embedded`, Node `>=22`, and `requiredPaidServices: []`.

- [ ] **Step 5: Run focused tests**

Run: `cd modules/artisys-serialport && npm test`

Expected: PASS for validation/error tests.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-serialport
git commit -m "feat(serialport): add package contract and profile validation"
```

---

### Task 2: Serial transport and manager

**Files:**
- Create: `modules/artisys-serialport/src/serial-transport.js`
- Create: `modules/artisys-serialport/src/serial-port-manager.js`
- Create: `modules/artisys-serialport/tests/serial-transport.test.js`
- Modify: `modules/artisys-serialport/src/index.js`

**Interfaces:**
- Consumes: `SerialPortClass`, normalized device profile.
- Produces: `createSerialTransport({ SerialPortClass, profile })` with `open()`, `close()`, `write(data)`, `drain()`, `onData(handler)`, `status()`; `createSerialPortManager({ SerialPortClass })` with `list()` and `createTransport(profile)`.

- [ ] **Step 1: Write fake-port transport tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createSerialTransport } = require('../src');

class FakePort extends EventEmitter {
  static async list(){ return [{ path:'COM3', manufacturer:'Fake' }]; }
  constructor(options){ super(); this.options=options; this.isOpen=false; this.writes=[]; }
  open(cb){ this.isOpen=true; cb?.(); }
  close(cb){ this.isOpen=false; cb?.(); }
  write(data, cb){ this.writes.push(Buffer.from(data)); cb?.(); }
  drain(cb){ cb?.(); }
}

test('opens, writes, drains and closes one port', async () => {
  const transport = createSerialTransport({ SerialPortClass:FakePort, profile:{ path:'COM3', baudRate:9600 } });
  await transport.open();
  await transport.write('PING');
  await transport.drain();
  assert.equal((await transport.status()).state, 'open');
  await transport.close();
  assert.equal((await transport.status()).state, 'closed');
});
```

- [ ] **Step 2: Run test and confirm red**

Run: `node --test modules/artisys-serialport/tests/serial-transport.test.js`

Expected: FAIL because `createSerialTransport` is not exported.

- [ ] **Step 3: Implement the transport state machine**

Use one internal port instance and state values `closed`, `opening`, `open`, `closing`, `error`. Promise-wrap callback operations. Before `write` or `drain`, require `state === 'open'`; map open failures to `SERIAL_OPEN_FAILED`, write/drain failures to `SERIAL_WRITE_FAILED`, and unexpected port `error` events to `SERIAL_DISCONNECTED`.

Core shape:

```js
function createSerialTransport({ SerialPortClass, profile } = {}) {
  const normalized = normalizeDeviceProfile(profile);
  let port = null;
  let state = 'closed';
  const listeners = new Set();
  return {
    async open(){ /* transition closed -> opening -> open */ },
    async close(){ /* idempotent close -> closed */ },
    async write(data){ /* Buffer.from when needed; reject if not open */ },
    async drain(){ /* callback -> Promise */ },
    onData(handler){ listeners.add(handler); return () => listeners.delete(handler); },
    async status(){ return { available:true, state, ...normalized }; },
    _getPortForTest(){ return port; }
  };
}
```

- [ ] **Step 4: Implement manager/list discovery**

```js
function createSerialPortManager({ SerialPortClass } = {}) {
  if (!SerialPortClass) throw new TypeError('SerialPortClass is required.');
  return Object.freeze({
    async list(){ return SerialPortClass.list(); },
    createTransport(profile){ return createSerialTransport({ SerialPortClass, profile }); }
  });
}
```

Export both factories from `src/index.js`.

- [ ] **Step 5: Add concurrency/error assertions and run tests**

Add tests that call `open()` twice concurrently and assert only one underlying `open` transition; add a fake write failure and assert `error.code === 'SERIAL_WRITE_FAILED'`.

Run: `cd modules/artisys-serialport && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-serialport/src modules/artisys-serialport/tests
git commit -m "feat(serialport): add reusable serial transport"
```

---

### Task 3: Request/response session and parsers

**Files:**
- Create: `modules/artisys-serialport/src/request-response-session.js`
- Create: `modules/artisys-serialport/src/parsers/numeric-weight.js`
- Create: `modules/artisys-serialport/src/parsers/line-buffer.js`
- Create: `modules/artisys-serialport/tests/request-response-session.test.js`
- Modify: `modules/artisys-serialport/src/index.js`

**Interfaces:**
- Consumes: any transport implementing `open/close/write/onData`, parser callback.
- Produces: `createRequestResponseSession({ transport, request, timeoutMs, parse, closeAfterResponse })`, `parseNumericWeight(input)`, `createLineBuffer({ delimiter })`.

- [ ] **Step 1: Write fragmented-response and timeout tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createRequestResponseSession, parseNumericWeight } = require('../src');

class FakeTransport extends EventEmitter {
  async open(){}
  async close(){ this.closed=true; }
  async write(value){ this.request=value; }
  onData(handler){ this.on('data', handler); return () => this.off('data', handler); }
}

test('parses a response split across chunks', async () => {
  const transport = new FakeTransport();
  const session = createRequestResponseSession({ transport, request:'P', timeoutMs:100, parse:parseNumericWeight });
  const pending = session.run();
  transport.emit('data', Buffer.from('12,'));
  transport.emit('data', Buffer.from('345 kg\r\n'));
  assert.equal(await pending, 12.345);
  assert.equal(transport.closed, true);
});
```

- [ ] **Step 2: Run and confirm red**

Run: `node --test modules/artisys-serialport/tests/request-response-session.test.js`

Expected: FAIL because session/parser do not exist.

- [ ] **Step 3: Implement numeric parser**

```js
function parseNumericWeight(input) {
  const match = String(input).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) throw new SerialError('SERIAL_PARSE_FAILED', 'Resposta sem peso reconhecivel.');
  const value = Number(match[0]);
  if (!Number.isFinite(value)) throw new SerialError('SERIAL_PARSE_FAILED', 'Peso invalido.');
  return value;
}
```

- [ ] **Step 4: Implement one-shot session**

`run()` must open the transport, subscribe to data before sending the request, accumulate chunks in order, attempt `parse(buffer)` after each chunk, resolve only when the parser returns a finite/non-undefined value, reject after `timeoutMs` with `SERIAL_TIMEOUT`, remove listeners, clear timer, and close in `finally` when `closeAfterResponse !== false`.

- [ ] **Step 5: Add parser-failure and timeout coverage**

Test malformed input until timeout, explicit parser throw with `SERIAL_PARSE_FAILED`, and closure after both success and failure.

Run: `cd modules/artisys-serialport && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-serialport/src modules/artisys-serialport/tests
git commit -m "feat(serialport): add request response sessions"
```

---

### Task 4: Scale, drawer and generic-device adapters

**Files:**
- Create: `modules/artisys-serialport/src/adapters/scale.js`
- Create: `modules/artisys-serialport/src/adapters/drawer.js`
- Create: `modules/artisys-serialport/src/adapters/generic-device.js`
- Create: `modules/artisys-serialport/tests/adapters.test.js`
- Modify: `modules/artisys-serialport/src/index.js`

**Interfaces:**
- Consumes: transport/session factories and device profiles.
- Produces: `createScaleAdapter(options)`, `createDrawerAdapter(options)`, `createGenericSerialDevice(options)`.

- [ ] **Step 1: Write adapter tests**

```js
test('scale returns normalized kilograms', async () => {
  const scale = createScaleAdapter({ session:{ run:async()=>1.23456 }, profile:{ path:'COM3', baudRate:9600 } });
  assert.deepEqual(await scale.readWeight(), { weight:1.235, unit:'kg' });
});

test('drawer writes the configured ESC/POS pulse and drains', async () => {
  const writes=[];
  const transport={
    async open(){}, async close(){}, async write(data){writes.push(Buffer.from(data));}, async drain(){}, async status(){return {state:'open'};}
  };
  const drawer=createDrawerAdapter({ transport });
  assert.equal(await drawer.open(), true);
  assert.deepEqual([...writes[0]], [0x1b,0x70,0x00,0x19,0xfa]);
});
```

- [ ] **Step 2: Run and confirm red**

Run: `node --test modules/artisys-serialport/tests/adapters.test.js`

Expected: FAIL because adapters are not exported.

- [ ] **Step 3: Implement scale adapter**

`readWeight()` calls the provided session; reject negative/non-finite values with `SERIAL_PARSE_FAILED`; round `Math.round(value * 1000) / 1000`; `status()` reports profile information; expose optional `tare()` only when a tare callback is supplied.

- [ ] **Step 4: Implement drawer adapter**

Default pulse is `Buffer.from([0x1b,0x70,0x00,0x19,0xfa])`. `open()` must open transport, write pulse, drain, then close in `finally`; status delegates to transport.

- [ ] **Step 5: Implement generic device**

Expose the underlying stable transport methods without the upstream object:

```js
return Object.freeze({
  open:()=>transport.open(), close:()=>transport.close(),
  write:data=>transport.write(data), drain:()=>transport.drain(),
  onData:handler=>transport.onData(handler), status:()=>transport.status()
});
```

- [ ] **Step 6: Run the module suite**

Run: `cd modules/artisys-serialport && npm test && npm run check`

Expected: all tests PASS and syntax checks exit 0.

- [ ] **Step 7: Commit**

```bash
git add modules/artisys-serialport
git commit -m "feat(serialport): add scale drawer and generic adapters"
```

---

### Task 5: Documentation and catalog registration

**Files:**
- Create: `modules/artisys-serialport/README.md`
- Create: `modules/artisys-serialport/LICENSE`
- Modify: `catalog/modules.json`
- Modify: `modules/README.md`

**Interfaces:**
- Consumes: completed module API.
- Produces: discoverable, documented module kit in `utilidades`.

- [ ] **Step 1: Document consumer usage**

README must include a no-hardware quick test and PDV-oriented examples:

```js
const { SerialPort } = require('serialport');
const {
  createSerialTransport,
  createRequestResponseSession,
  createScaleAdapter,
  parseNumericWeight
} = require('@artisys/serialport');

const transport = createSerialTransport({ SerialPortClass:SerialPort, profile:{ path:'COM3', baudRate:9600 } });
const session = createRequestResponseSession({ transport, request:'P', timeoutMs:1500, parse:parseNumericWeight });
const scale = createScaleAdapter({ session, profile:{ path:'COM3', baudRate:9600 } });
```

Document Windows (`COM3`), Linux (`/dev/ttyUSB0`) and macOS (`/dev/tty.*`) path examples without promising automatic compatibility with every device protocol.

- [ ] **Step 2: Register module in catalog**

Add this object to `catalog/modules.json` without changing unrelated module versions:

```json
{
  "id": "artisys-serialport",
  "version": "0.1.0",
  "status": "implemented",
  "consumptionMode": "shared",
  "executionMode": "embedded",
  "upstreams": ["node-serialport"],
  "recommendedConsumers": ["PDV-ARTISYS", "desktop-products-with-serial-hardware"]
}
```

Add `artisys-serialport — implemented 0.1.0 — Node SerialPort` to `modules/README.md`.

- [ ] **Step 3: Verify provenance remains single-source**

Run:

```bash
grep -n 'projects/hardware/node-serialport' .gitmodules
grep -n '"id":"node-serialport"' catalog/projects.json
```

Expected: one upstream registration in each file; do not add a duplicate.

- [ ] **Step 4: Run final verification**

Run: `cd modules/artisys-serialport && npm install && npm test && npm run check`

Expected: install succeeds with no paid service/account, all tests pass, syntax checks pass.

- [ ] **Step 5: Commit**

```bash
git add modules/artisys-serialport catalog/modules.json modules/README.md
git commit -m "docs(serialport): register reusable module"
```
