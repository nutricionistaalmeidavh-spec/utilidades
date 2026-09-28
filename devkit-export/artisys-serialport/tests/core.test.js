'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  SerialError,
  normalizeDeviceProfile,
  createSerialPortManager,
  createSerialTransport,
  createRequestResponseSession,
  parseNumericWeight,
  createLineBuffer,
  createScaleAdapter,
  createDrawerAdapter,
  createGenericSerialDevice
} = require('../src');

class FakePort extends EventEmitter {
  static instances = [];
  static ports = [{ path:'COM3', manufacturer:'Fake' }];
  static async list(){ return this.ports; }
  constructor(options){
    super();
    this.options=options;
    this.isOpen=false;
    this.writes=[];
    this.openCalls=0;
    this.failOpen=null;
    this.failWrite=null;
    FakePort.instances.push(this);
  }
  open(cb){ this.openCalls += 1; setImmediate(()=>{ if(this.failOpen) cb(this.failOpen); else { this.isOpen=true; cb(); } }); }
  close(cb){ this.isOpen=false; setImmediate(()=>cb?.()); }
  write(data, cb){ this.writes.push(Buffer.from(data)); setImmediate(()=>cb?.(this.failWrite)); }
  drain(cb){ setImmediate(()=>cb?.()); }
}

test('normalizes a serial device profile', () => {
  assert.deepEqual(normalizeDeviceProfile({ path:'COM3', baudRate:9600 }), {
    path:'COM3', baudRate:9600, dataBits:8, stopBits:1, parity:'none'
  });
});

test('missing serial path uses a stable error code', () => {
  assert.throws(() => normalizeDeviceProfile({ baudRate:9600 }), error => {
    assert.equal(error instanceof SerialError, true);
    assert.equal(error.code, 'SERIAL_PORT_NOT_FOUND');
    return true;
  });
});

test('manager lists ports and creates transports', async () => {
  const manager=createSerialPortManager({ SerialPortClass:FakePort });
  assert.deepEqual(await manager.list(), FakePort.ports);
  assert.equal(typeof manager.createTransport({ path:'COM3' }).open, 'function');
});

test('transport opens once under concurrent callers, writes, drains and closes', async () => {
  FakePort.instances.length=0;
  const transport=createSerialTransport({ SerialPortClass:FakePort, profile:{ path:'COM3', baudRate:9600 } });
  await Promise.all([transport.open(), transport.open()]);
  const port=FakePort.instances.at(-1);
  assert.equal(port.openCalls, 1);
  await transport.write('PING');
  await transport.drain();
  assert.equal(port.writes[0].toString(), 'PING');
  assert.equal((await transport.status()).state, 'open');
  await transport.close();
  assert.equal((await transport.status()).state, 'closed');
});

test('transport maps busy/open and write failures to stable codes', async () => {
  class BusyPort extends FakePort { open(cb){ setImmediate(()=>cb(Object.assign(new Error('Resource busy'), { code:'EBUSY' }))); } }
  const busy=createSerialTransport({ SerialPortClass:BusyPort, profile:{ path:'COM9' } });
  await assert.rejects(busy.open(), error => error.code === 'SERIAL_PORT_BUSY');

  class BadWritePort extends FakePort { write(_data, cb){ setImmediate(()=>cb(new Error('write failed'))); } }
  const bad=createSerialTransport({ SerialPortClass:BadWritePort, profile:{ path:'COM8' } });
  await bad.open();
  await assert.rejects(bad.write('X'), error => error.code === 'SERIAL_WRITE_FAILED');
  await bad.close();
});

test('request-response session aggregates fragmented data and closes after success', async () => {
  const events=new EventEmitter();
  const transport={
    closed:false,
    async open(){}, async close(){ this.closed=true; }, async write(value){ this.request=value; },
    onData(handler){ events.on('data',handler); return ()=>events.off('data',handler); }
  };
  const session=createRequestResponseSession({
    transport, request:'P', timeoutMs:200,
    parse:buffer => String(buffer).includes('kg') ? parseNumericWeight(buffer) : undefined
  });
  const pending=session.run();
  await new Promise(resolve=>setImmediate(resolve));
  events.emit('data', Buffer.from('12,'));
  events.emit('data', Buffer.from('345 kg\r\n'));
  assert.equal(await pending, 12.345);
  assert.equal(transport.request, 'P');
  assert.equal(transport.closed, true);
});

test('request-response session times out with stable code and closes', async () => {
  const transport={ async open(){}, async close(){ this.closed=true; }, onData(){ return ()=>{}; }, async write(){} };
  const session=createRequestResponseSession({ transport, timeoutMs:10, parse:()=>undefined });
  await assert.rejects(session.run(), error => error.code === 'SERIAL_TIMEOUT');
  assert.equal(transport.closed, true);
});

test('line buffer emits complete delimited lines and retains remainder', () => {
  const buffer=createLineBuffer({ delimiter:'\n' });
  assert.deepEqual(buffer.push('A\nB'), ['A']);
  assert.deepEqual(buffer.push('\nC\n'), ['B','C']);
  assert.equal(buffer.flush(), '');
});

test('scale adapter returns kilograms rounded to three decimals and rejects negative values', async () => {
  const scale=createScaleAdapter({ session:{ run:async()=>1.23456 }, profile:{ path:'COM3', baudRate:9600 } });
  assert.deepEqual(await scale.readWeight(), { weight:1.235, unit:'kg' });
  const invalid=createScaleAdapter({ session:{ run:async()=>-1 }, profile:{ path:'COM3' } });
  await assert.rejects(invalid.readWeight(), error => error.code === 'SERIAL_PARSE_FAILED');
});

test('drawer emits configurable ESC/POS pulse and closes transport', async () => {
  const writes=[];
  const transport={
    closed:false, async open(){}, async close(){this.closed=true;},
    async write(data){writes.push(Buffer.from(data));}, async drain(){}, async status(){return {state:'open'};}
  };
  const drawer=createDrawerAdapter({ transport });
  assert.equal(await drawer.open(), true);
  assert.deepEqual([...writes[0]], [0x1b,0x70,0x00,0x19,0xfa]);
  assert.equal(transport.closed, true);
});

test('generic device exposes transport contract without upstream object', async () => {
  let opened=0;
  const transport={ async open(){opened++;}, async close(){}, async write(){}, async drain(){}, onData(){return ()=>{};}, async status(){return {state:'closed'};} };
  const device=createGenericSerialDevice({ transport });
  await device.open();
  assert.equal(opened,1);
  assert.deepEqual(await device.status(), {state:'closed'});
  assert.equal('port' in device, false);
});
