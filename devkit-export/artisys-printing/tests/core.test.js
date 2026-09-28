'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PrintingError,
  createReceiptDocument,
  normalizePrinterProfile,
  renderPlainText,
  toReceiptLineMarkup,
  renderReceiptSvg,
  createElectronPrinterDriver,
  createTransportPrinterDriver,
  createThermalPrinterDriver,
  createPrinterResolver,
  money,
  fit,
  center,
  columns
} = require('../src');

test('receipt document defaults to 42 columns and is immutable', () => {
  const doc=createReceiptDocument({ title:'Loja', documentLabel:'CUPOM NAO FISCAL', items:[] });
  assert.equal(doc.width,42);
  assert.equal(Object.isFrozen(doc),true);
  assert.throws(()=>createReceiptDocument({ width:40 }), /32, 42 ou 48/);
});

test('printer profiles validate electron, thermal and transport modes', () => {
  assert.deepEqual(normalizePrinterProfile({ id:'main', mode:'electron', width:42, deviceName:'EPSON' }), {
    id:'main', mode:'electron', width:42, printerType:'generic', interface:null,
    deviceName:'EPSON', silent:false, cut:false, openDrawerAfterPrint:false
  });
  assert.throws(()=>normalizePrinterProfile({ id:'t', mode:'thermal' }), error => {
    assert.equal(error instanceof PrintingError,true);
    assert.equal(error.code,'PRINTER_NOT_CONFIGURED');
    return true;
  });
  assert.equal(normalizePrinterProfile({ id:'x', mode:'transport' }).mode,'transport');
});

test('plain text renderer preserves legacy receipt semantics', () => {
  const text=renderPlainText(createReceiptDocument({
    width:42, title:'Loja Matriz', documentLabel:'CUPOM NAO FISCAL',
    metadata:[['Venda','123'],['Operador','Maria']],
    items:[{ name:'Produto muito longo que deve caber sem ultrapassar a largura permitida', quantity:2, unitPriceCents:1500, totalCents:3000 }],
    totals:[['Subtotal',3000],['Desconto',-500],['TOTAL',2500]],
    payments:[['PIX',3000]], changeCents:500,
    footer:['Obrigado pela preferencia']
  }));
  assert.match(text,/Venda: 123/);
  assert.match(text,/Operador: Maria/);
  assert.match(text,/TOTAL/);
  assert.match(text,/25,00/);
  assert.match(text,/Troco/);
  assert.equal(text.endsWith('\n'),true);
  for (const line of text.trimEnd().split('\n')) assert.ok(line.length <= 42, `linha excedeu largura: ${line}`);
});

test('formatting helpers support signed cents and bounded columns', () => {
  assert.equal(money(-1234),'-12,34');
  assert.ok(fit('abcdefgh',4).length<=4);
  assert.ok(center('x',5).length<=5);
  assert.ok(columns('left','right',10).length<=10);
});

test('ReceiptLine adapter creates markup and SVG through injected transformer', async () => {
  const doc=createReceiptDocument({
    title:'Loja', documentLabel:'CUPOM NAO FISCAL',
    items:[{name:'Cafe',quantity:1,unitPriceCents:500,totalCents:500}],
    totals:[['TOTAL',500]], blocks:[{type:'qr',value:'https://example.local'}], footer:['Obrigado']
  });
  const markup=toReceiptLineMarkup(doc);
  assert.match(markup,/Loja/);
  assert.match(markup,/Cafe/);
  assert.match(markup,/TOTAL/);
  assert.match(markup,/example\.local/);
  const fake={ transform:async (_markup,options)=>`<svg data-command="${options.command}"></svg>` };
  const svg=await renderReceiptSvg(doc,{ receiptline:fake });
  assert.match(svg,/^<svg/);
});

test('Electron driver prints escaped text and always closes its hidden window', async () => {
  let loaded=''; let closed=false; let options=null;
  class FakeWindow {
    constructor(){ this.webContents={ print:(opts,cb)=>{options=opts; cb(true,'');} }; }
    async loadURL(url){loaded=url;}
    isDestroyed(){return false;}
    close(){closed=true;}
  }
  const driver=createElectronPrinterDriver({ BrowserWindow:FakeWindow });
  const result=await driver.print({ text:'<cupom>&', width:42 }, normalizePrinterProfile({id:'p',mode:'electron',width:42,deviceName:'EPSON',silent:true}));
  assert.equal(result.success,true);
  assert.equal(closed,true);
  assert.match(decodeURIComponent(loaded),/&lt;cupom&gt;&amp;/);
  assert.equal(options.deviceName,'EPSON');
  assert.equal(options.silent,true);
});

test('transport driver writes bytes, drains and closes', async () => {
  const calls=[];
  const transport={
    async open(){calls.push('open');}, async write(bytes){calls.push(['write',Buffer.from(bytes).toString()]);},
    async drain(){calls.push('drain');}, async close(){calls.push('close');}
  };
  const driver=createTransportPrinterDriver({ transport });
  const result=await driver.print('ABC',{id:'serial',mode:'transport',width:42});
  assert.equal(result.success,true);
  assert.deepEqual(calls,['open',['write','ABC'],'drain','close']);
});

test('transport write failures are normalized and still close', async () => {
  let closed=false;
  const driver=createTransportPrinterDriver({ transport:{ async open(){}, async write(){throw new Error('boom');}, async close(){closed=true;} } });
  await assert.rejects(driver.print('ABC',{id:'x',mode:'transport',width:42}), error => error.code === 'PRINTER_WRITE_FAILED');
  assert.equal(closed,true);
});

test('thermal driver maps Epson, prints, cuts and executes using injected upstream', async () => {
  const calls=[];
  class FakePrinter {
    constructor(options){calls.push(['ctor',options]);}
    println(text){calls.push(['println',text]);}
    cut(){calls.push(['cut']);}
    async execute(){calls.push(['execute']); return true;}
  }
  const driver=createThermalPrinterDriver({ thermalPrinter:{ printer:FakePrinter, types:{EPSON:'EPSON',STAR:'STAR'} } });
  const result=await driver.print('hello', normalizePrinterProfile({id:'p1',mode:'thermal',width:42,printerType:'epson',interface:'printer:EPSON',cut:true}));
  assert.equal(result.success,true);
  assert.equal(calls.some(call=>call[0]==='cut'),true);
  assert.equal(calls.some(call=>call[0]==='execute'),true);
});

test('thermal generic profile is rejected rather than guessing protocol', async () => {
  const driver=createThermalPrinterDriver({ thermalPrinter:{ printer:class {}, types:{EPSON:'EPSON',STAR:'STAR'} } });
  await assert.rejects(driver.print('x',{id:'x',mode:'thermal',width:42,printerType:'generic',interface:'x'}), error => error.code === 'PRINTER_UNSUPPORTED');
});

test('printer resolver selects only configured mode and does not silently fail over', () => {
  const electron={name:'electron'}, thermal={name:'thermal'}, transport={name:'transport'};
  const resolve=createPrinterResolver({electronDriver:electron,thermalDriver:thermal,transportDriver:transport});
  assert.equal(resolve({mode:'electron'}),electron);
  assert.equal(resolve({mode:'thermal'}),thermal);
  assert.equal(resolve({mode:'transport'}),transport);
  assert.throws(()=>createPrinterResolver({electronDriver:electron})({mode:'thermal'}), error => error.code === 'PRINTER_NOT_AVAILABLE');
});
