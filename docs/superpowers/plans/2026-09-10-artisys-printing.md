# ArtiSys Printing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@artisys/printing` as a reusable local printing module with a stable ArtiSys receipt model, plain-text fallback, ReceiptLine rendering, thermal-printer support and injected Electron/transport drivers.

**Architecture:** The module is CommonJS-first for direct use by `PDV-ARTISYS`. Product/domain code creates an ArtiSys `ReceiptDocument`; renderers turn it into plain text, ReceiptLine markup/SVG or command-ready output; drivers send the rendered result through `node-thermal-printer`, an injected Electron `BrowserWindow`, or any injected byte transport. The module never owns the PDV print queue or business rules.

**Tech Stack:** Node.js >=22, CommonJS, Node built-in test runner, `receiptline@4.0.4`, `node-thermal-printer@4.6.1`.

**Spec:** `docs/superpowers/specs/2026-09-10-artisys-printing-serialport-design.md`

## Global Constraints

- Core must work with R$ 0 license/subscription cost and no mandatory remote service.
- Execution is local/self-hosted; Electron is injected and is not a dependency of this package.
- `@artisys/serialport` is not a required dependency; serial/TCP/USB-like transports are injected through a narrow transport contract.
- Node version floor is `>=22`.
- Initial version is `0.1.0`, status `implemented`; physical printer validation is required before `stable`.
- Current `utilidades` already registers `receiptline` and `node-thermal-printer` upstreams in `.gitmodules` and `catalog/projects.json`; do not duplicate those entries.
- Widths supported by the compatibility renderer are exactly 32, 42 and 48 columns.
- Printing errors use stable codes: `PRINTER_NOT_CONFIGURED`, `PRINTER_NOT_AVAILABLE`, `PRINTER_UNSUPPORTED`, `PRINTER_RENDER_FAILED`, `PRINTER_WRITE_FAILED`, `PRINTER_TIMEOUT`.
- `node-thermal-printer@4.6.1` package metadata says `ISC`, while the pinned repository `LICENSE.md` is MIT; preserve the repository license evidence in docs/catalog and do not silently rewrite third-party license text.

---

### Task 1: Package contract, errors, receipt document and printer profile

**Files:**
- Create: `modules/artisys-printing/package.json`
- Create: `modules/artisys-printing/module.json`
- Create: `modules/artisys-printing/src/errors.js`
- Create: `modules/artisys-printing/src/receipt-document.js`
- Create: `modules/artisys-printing/src/printer-profile.js`
- Create: `modules/artisys-printing/src/index.js`
- Create: `modules/artisys-printing/tests/core.test.js`

**Interfaces:**
- Consumes: plain document/profile objects.
- Produces: `PrintingError`, `createReceiptDocument(input)`, `normalizePrinterProfile(input)` and public package exports.

- [ ] **Step 1: Write failing core tests**

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createReceiptDocument, normalizePrinterProfile, PrintingError } = require('../src');

test('creates immutable receipt document with 42 columns by default', () => {
  const doc = createReceiptDocument({ title:'Loja', documentLabel:'CUPOM NAO FISCAL', items:[] });
  assert.equal(doc.width, 42);
  assert.equal(Object.isFrozen(doc), true);
});

test('rejects unsupported width', () => {
  assert.throws(() => createReceiptDocument({ width:40 }), /32, 42 ou 48/);
});

test('electron profile accepts deviceName without interface', () => {
  assert.deepEqual(normalizePrinterProfile({ id:'main', mode:'electron', width:42, deviceName:'EPSON' }), {
    id:'main', mode:'electron', width:42, printerType:'generic', interface:null,
    deviceName:'EPSON', silent:false, cut:false, openDrawerAfterPrint:false
  });
});
```

- [ ] **Step 2: Run and confirm red**

Run: `cd modules/artisys-printing && node --test tests/core.test.js`

Expected: FAIL because `../src` does not exist yet.

- [ ] **Step 3: Implement printing errors**

```js
'use strict';
class PrintingError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'PrintingError';
    this.code = code;
  }
}
function wrapPrintingError(error, code) {
  if (error instanceof PrintingError) return error;
  return new PrintingError(code, error?.message || String(error || 'Printing error'), { cause:error instanceof Error ? error : undefined });
}
module.exports = { PrintingError, wrapPrintingError };
```

- [ ] **Step 4: Implement receipt/profile normalization**

`createReceiptDocument()` copies arrays/objects, validates width against `[32,42,48]`, normalizes missing arrays to `[]`, and deep-freezes only the top-level document plus item/metadata/totals/payment entries so a caller cannot mutate queued content accidentally.

`normalizePrinterProfile()` supports:

```js
{
  id:'default',
  mode:'electron' | 'thermal' | 'transport',
  width:32 | 42 | 48,
  printerType:'epson' | 'star' | 'generic',
  interface:null | string,
  deviceName:null | string,
  silent:false,
  cut:false,
  openDrawerAfterPrint:false
}
```

Rules: `thermal` requires `interface`; `transport` does not require interface because the transport object is injected separately; `electron` may use only `deviceName`.

- [ ] **Step 5: Add package metadata**

`package.json`:

```json
{
  "name": "@artisys/printing",
  "version": "0.1.0",
  "type": "commonjs",
  "main": "./src/index.js",
  "exports": { ".": "./src/index.js" },
  "engines": { "node": ">=22" },
  "files": ["src", "README.md", "module.json", "LICENSE"],
  "scripts": { "test": "node --test tests/*.test.js", "check": "node --check src/*.js src/renderers/*.js src/drivers/*.js" },
  "dependencies": {
    "receiptline": "4.0.4",
    "node-thermal-printer": "4.6.1"
  },
  "license": "MIT"
}
```

`module.json` records `id: artisys-printing`, version `0.1.0`, status `implemented`, consumption `shared`, execution `embedded`, upstreams `receiptline` and `node-thermal-printer`, Node `>=22`, and `requiredPaidServices: []`.

- [ ] **Step 6: Run tests and commit**

Run: `cd modules/artisys-printing && npm test`

Expected: PASS.

```bash
git add modules/artisys-printing
git commit -m "feat(printing): add receipt and printer contracts"
```

---

### Task 2: Plain-text compatibility renderer

**Files:**
- Create: `modules/artisys-printing/src/renderers/plain-text.js`
- Create: `modules/artisys-printing/tests/plain-text.test.js`
- Modify: `modules/artisys-printing/src/index.js`

**Interfaces:**
- Consumes: `ReceiptDocument`.
- Produces: `renderPlainText(document)` and helpers `money`, `fit`, `center`, `columns` for compatibility tests/consumers that need exact legacy formatting.

- [ ] **Step 1: Write exact-output tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createReceiptDocument, renderPlainText } = require('../src');

test('renders totals, payment and change in 42 columns', () => {
  const text = renderPlainText(createReceiptDocument({
    width:42, title:'Loja Matriz', documentLabel:'CUPOM NAO FISCAL',
    metadata:[['Venda','123'],['Operador','Maria']],
    items:[{ name:'Produto A', quantity:2, unitPriceCents:1500, totalCents:3000 }],
    totals:[['Subtotal',3000],['TOTAL',3000]], payments:[['PIX',3500]], changeCents:500,
    footer:['Obrigado pela preferencia']
  }));
  assert.match(text, /Produto A/);
  assert.match(text, /TOTAL/);
  assert.match(text, /30,00/);
  assert.match(text, /Troco/);
  assert.equal(text.endsWith('\n'), true);
});
```

- [ ] **Step 2: Run and confirm red**

Run: `node --test modules/artisys-printing/tests/plain-text.test.js`

Expected: FAIL because renderer is missing.

- [ ] **Step 3: Implement compatibility helpers**

Port the semantics of the PDV's existing helpers, not imports from the PDV:

```js
function money(cents) {
  const value = Math.trunc(Number(cents || 0));
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2,'0')}`;
}
```

`fit`, `center`, and `columns` must ensure every emitted line is at most the selected width.

- [ ] **Step 4: Implement renderer**

Render title/label, metadata, items, totals, payments, optional `changeCents`, and footer. Preserve item format `<quantity> x <unit price>` and append a trailing newline. Reject malformed documents with `PRINTER_RENDER_FAILED`.

- [ ] **Step 5: Add width snapshots and run suite**

Add tests for 32/42/48 columns and truncation of long product names.

Run: `cd modules/artisys-printing && npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-printing/src modules/artisys-printing/tests
git commit -m "feat(printing): add plain text receipt renderer"
```

---

### Task 3: ReceiptLine adapter and SVG preview

**Files:**
- Create: `modules/artisys-printing/src/renderers/receiptline.js`
- Create: `modules/artisys-printing/tests/receiptline.test.js`
- Modify: `modules/artisys-printing/src/index.js`

**Interfaces:**
- Consumes: `ReceiptDocument`, injected/default `receiptline` library.
- Produces: `toReceiptLineMarkup(document)`, `renderReceiptLine(document, options)`, `renderReceiptSvg(document, options)`.

- [ ] **Step 1: Write markup/preview tests**

```js
test('converts receipt document to ReceiptLine markup', () => {
  const markup = toReceiptLineMarkup(createReceiptDocument({
    title:'Loja', documentLabel:'CUPOM NAO FISCAL',
    items:[{name:'Cafe', quantity:1, unitPriceCents:500, totalCents:500}],
    totals:[['TOTAL',500]], footer:['Obrigado']
  }));
  assert.match(markup, /Loja/);
  assert.match(markup, /Cafe/);
  assert.match(markup, /TOTAL/);
});

test('renders SVG through injected ReceiptLine converter', async () => {
  const fake={ transform:async (_markup, options)=>`<svg data-cmd="${options.command}"></svg>` };
  const svg=await renderReceiptSvg(createReceiptDocument({title:'Loja'}), { receiptline:fake });
  assert.match(svg, /^<svg/);
});
```

- [ ] **Step 2: Run and confirm red**

Run: `node --test modules/artisys-printing/tests/receiptline.test.js`

Expected: FAIL because adapter functions do not exist.

- [ ] **Step 3: Implement ArtiSys-to-ReceiptLine markup**

Keep ReceiptLine syntax inside this file. Map document title/label to centered lines, item/totals/payment pairs to two-column rows, and optional structured blocks:

```js
if (block.type === 'qr') lines.push(`{code:${String(block.value)}}`);
if (block.type === 'barcode') lines.push(`{code:${String(block.value)}; option:${block.symbology || 'code128'}}`);
```

If a future ReceiptLine syntax change occurs, only this adapter changes.

- [ ] **Step 4: Implement transform wrapper**

Use `require('receiptline')` lazily when no injected library is provided. `renderReceiptSvg()` calls `receiptline.transform(markup, { command:'svg', cpl:document.width, ... })`. `renderReceiptLine()` accepts an explicit command such as `escpos` or `starsbcs` and returns the transform result. Wrap failures as `PRINTER_RENDER_FAILED`.

- [ ] **Step 5: Run ReceiptLine tests against real dependency**

Run: `cd modules/artisys-printing && npm install && npm test`

Expected: injected tests and at least one real `command:'svg'` smoke test PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-printing
git commit -m "feat(printing): add receiptline rendering adapter"
```

---

### Task 4: Electron and generic transport drivers

**Files:**
- Create: `modules/artisys-printing/src/drivers/electron-printer.js`
- Create: `modules/artisys-printing/src/drivers/transport-printer.js`
- Create: `modules/artisys-printing/tests/drivers.test.js`
- Modify: `modules/artisys-printing/src/index.js`

**Interfaces:**
- Consumes: injected `BrowserWindow` or injected `{ open?, close?, write, drain?, status? }` transport.
- Produces: `createElectronPrinterDriver({ BrowserWindow })`, `createTransportPrinterDriver({ transport })`.

- [ ] **Step 1: Write Electron fake tests**

```js
test('electron driver closes hidden window after print', async () => {
  let closed=false;
  class FakeWindow {
    constructor(){ this.webContents={ print:(_opts,cb)=>cb(true,'') }; }
    async loadURL(){}
    isDestroyed(){ return false; }
    close(){ closed=true; }
  }
  const driver=createElectronPrinterDriver({ BrowserWindow:FakeWindow });
  const result=await driver.print({ text:'hello', width:42 }, { mode:'electron', width:42, silent:true });
  assert.equal(result.success, true);
  assert.equal(closed, true);
});
```

- [ ] **Step 2: Run and confirm red**

Run: `node --test modules/artisys-printing/tests/drivers.test.js`

Expected: FAIL because drivers do not exist.

- [ ] **Step 3: Implement Electron driver**

Move the current PDV strategy into the module: HTML-escape text, create hidden window, load a `data:text/html` `<pre>`, call `webContents.print`, and always close in `finally`. Accept `deviceName` and `silent` from the normalized profile. Return `{ success, driver:'electron', device, failureReason }`; do not mutate any print queue.

- [ ] **Step 4: Implement generic transport driver**

```js
async function print(rendered, profile = {}) {
  const bytes = Buffer.isBuffer(rendered) ? rendered : Buffer.from(String(rendered));
  try {
    if (transport.open) await transport.open();
    await transport.write(bytes);
    if (transport.drain) await transport.drain();
    return { success:true, driver:'transport', device:profile.id || null };
  } catch (error) {
    throw wrapPrintingError(error, 'PRINTER_WRITE_FAILED');
  } finally {
    if (transport.close) await transport.close().catch(()=>{});
  }
}
```

- [ ] **Step 5: Add failure/cleanup tests and run suite**

Test Electron callback failure, transport write failure, and close-after-failure.

Run: `cd modules/artisys-printing && npm test && npm run check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-printing
git commit -m "feat(printing): add electron and transport drivers"
```

---

### Task 5: Thermal-printer adapter and driver resolver

**Files:**
- Create: `modules/artisys-printing/src/drivers/thermal-printer.js`
- Create: `modules/artisys-printing/src/driver-resolver.js`
- Create: `modules/artisys-printing/tests/thermal-printer.test.js`
- Modify: `modules/artisys-printing/src/index.js`

**Interfaces:**
- Consumes: normalized profile, injected/default `node-thermal-printer`, optional Electron/transport drivers.
- Produces: `createThermalPrinterDriver(options)`, `createPrinterResolver(options)`.

- [ ] **Step 1: Write thermal adapter tests with a fake upstream**

```js
test('thermal driver configures Epson and executes printer', async () => {
  const calls=[];
  class FakePrinter {
    constructor(options){ calls.push(['ctor', options]); }
    println(text){ calls.push(['println', text]); }
    cut(){ calls.push(['cut']); }
    async execute(){ calls.push(['execute']); return true; }
  }
  const upstream={ printer:FakePrinter, types:{ EPSON:'EPSON', STAR:'STAR' } };
  const driver=createThermalPrinterDriver({ thermalPrinter:upstream });
  const result=await driver.print('hello', { id:'p1', mode:'thermal', width:42, printerType:'epson', interface:'printer:EPSON', cut:true });
  assert.equal(result.success, true);
  assert.equal(calls.some(call=>call[0]==='execute'), true);
});
```

- [ ] **Step 2: Run and confirm red**

Run: `node --test modules/artisys-printing/tests/thermal-printer.test.js`

Expected: FAIL because thermal driver is missing.

- [ ] **Step 3: Implement lazy upstream resolution**

Support both the real module export shape and injected tests. Map `printerType` `epson`/`star` to upstream types; reject `generic` with `PRINTER_UNSUPPORTED` in this driver instead of guessing a protocol.

The driver must call `println` with string output, optionally call `cut()`, call `execute()`, and normalize a successful result to:

```js
{ success:true, driver:'thermal', device:profile.interface, printedAt:new Date().toISOString() }
```

Wrap upstream failures as `PRINTER_WRITE_FAILED`.

- [ ] **Step 4: Implement resolver**

```js
function createPrinterResolver({ electronDriver, thermalDriver, transportDriver } = {}) {
  return function resolve(profile) {
    if (profile.mode === 'electron' && electronDriver) return electronDriver;
    if (profile.mode === 'thermal' && thermalDriver) return thermalDriver;
    if (profile.mode === 'transport' && transportDriver) return transportDriver;
    throw new PrintingError('PRINTER_NOT_AVAILABLE', `Driver indisponivel para ${profile.mode}.`);
  };
}
```

- [ ] **Step 5: Run full module suite**

Run: `cd modules/artisys-printing && npm test && npm run check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-printing
git commit -m "feat(printing): add thermal printer driver"
```

---

### Task 6: Documentation and catalog registration

**Files:**
- Create: `modules/artisys-printing/README.md`
- Create: `modules/artisys-printing/LICENSE`
- Modify: `catalog/modules.json`
- Modify: `modules/README.md`
- Modify only if license evidence is wrong: `catalog/projects.json`

**Interfaces:**
- Consumes: finished module API.
- Produces: documented reusable printing kit in `utilidades`.

- [ ] **Step 1: Document three supported modes**

README examples must show:

```js
const { createReceiptDocument, renderPlainText, createElectronPrinterDriver } = require('@artisys/printing');
const document = createReceiptDocument({ title:'Loja Matriz', documentLabel:'CUPOM NAO FISCAL', totals:[['TOTAL',1500]] });
const text = renderPlainText(document);
```

Then document `thermal` and injected `transport` examples, with a clear statement that compatibility depends on the printer's actual protocol/interface.

- [ ] **Step 2: Register module**

Add to `catalog/modules.json`:

```json
{
  "id": "artisys-printing",
  "version": "0.1.0",
  "status": "implemented",
  "consumptionMode": "shared",
  "executionMode": "embedded",
  "upstreams": ["receiptline", "node-thermal-printer"],
  "recommendedConsumers": ["PDV-ARTISYS", "desktop-products-with-receipts"]
}
```

Add `artisys-printing — implemented 0.1.0 — ReceiptLine + node-thermal-printer` to `modules/README.md`.

- [ ] **Step 3: Verify third-party license evidence**

Compare pinned `projects/printing/node-thermal-printer/LICENSE.md` with the catalog license field. If the pinned LICENSE text is MIT, retain `MIT` in `catalog/projects.json` and note in `modules/artisys-printing/README.md` that npm package metadata for 4.6.1 reports ISC while the pinned repository license file reports MIT; this is provenance documentation, not legal advice.

- [ ] **Step 4: Final verification**

Run:

```bash
cd modules/artisys-printing
npm install
npm test
npm run check
node -e "const p=require('./src'); console.log(Object.keys(p).sort().join('\n'))"
```

Expected: dependency install succeeds locally, all tests pass, syntax check passes, public symbols print without loading Electron.

- [ ] **Step 5: Commit**

```bash
git add modules/artisys-printing catalog/modules.json modules/README.md catalog/projects.json
git commit -m "docs(printing): register reusable module"
```
