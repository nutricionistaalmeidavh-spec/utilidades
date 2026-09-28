import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  normalizePhone,
  renderTemplate,
  buildWhatsAppWebUrl,
  createTemplateStore,
  createWhatsAppWebController,
  persistentPartition
} from '../src/index.mjs';

test('normalizes Brazilian local mobile phone to E.164 digits', () => {
  assert.equal(normalizePhone('(16) 99999-9999'), '5516999999999');
});

test('preserves phone that already contains country code', () => {
  assert.equal(normalizePhone('+55 16 99999-9999'), '5516999999999');
});

test('renders declared variables and rejects unresolved variables in strict mode', () => {
  assert.equal(renderTemplate('Olá {nome}, total {valor}.', { nome: 'Ana', valor: 'R$ 20,00' }), 'Olá Ana, total R$ 20,00.');
  assert.throws(() => renderTemplate('Olá {nome} {faltante}', { nome: 'Ana' }), /faltante/);
});

test('builds WhatsApp Web URL with normalized phone and prefilled message', () => {
  const url = new URL(buildWhatsAppWebUrl({ phone: '(16) 99999-9999', message: 'Olá João' }));
  assert.equal(url.origin + url.pathname, 'https://web.whatsapp.com/send');
  assert.equal(url.searchParams.get('phone'), '5516999999999');
  assert.equal(url.searchParams.get('text'), 'Olá João');
});

test('template store creates and edits local templates', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'artisys-wa-'));
  try {
    const filePath = path.join(dir, 'templates.json');
    const store = createTemplateStore({ filePath });
    await store.upsert({ id: 'orcamento', name: 'Orçamento', text: 'Olá {nome}' });
    await store.upsert({ id: 'orcamento', name: 'Orçamento atualizado', text: 'Olá {nome}, valor {valor}' });
    assert.deepEqual(await store.list(), [{ id: 'orcamento', name: 'Orçamento atualizado', text: 'Olá {nome}, valor {valor}' }]);
    assert.equal(await store.render('orcamento', { nome: 'Bia', valor: 'R$ 10,00' }), 'Olá Bia, valor R$ 10,00');
    const persisted = JSON.parse(await readFile(filePath, 'utf8'));
    assert.equal(persisted.templates.length, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('uses a persistent Electron partition for WhatsApp login', () => {
  assert.equal(persistentPartition(), 'persist:artisys-whatsapp-launcher');
  assert.equal(persistentPartition('cliente-a'), 'persist:cliente-a');
});

test('Electron controller embeds a WebContentsView and opens chats without auto-send', async () => {
  const calls = [];
  class FakeView {
    constructor(options) {
      calls.push(['construct', options]);
      this.webContents = {
        loadURL: async (url) => calls.push(['loadURL', url]),
        session: { clearStorageData: async () => calls.push(['clear']) }
      };
    }
    setBounds(bounds) { calls.push(['bounds', bounds]); }
  }
  const parentWindow = { contentView: { addChildView: view => calls.push(['add', view]) } };
  const controller = createWhatsAppWebController({ WebContentsView: FakeView, parentWindow, partition: 'persist:test' });
  controller.setBounds({ x: 0, y: 0, width: 800, height: 600 });
  await controller.openChat({ phone: '16999999999', message: 'Teste' });
  assert.equal(calls[0][1].webPreferences.partition, 'persist:test');
  assert.equal(calls[0][1].webPreferences.nodeIntegration, false);
  assert.equal(calls[0][1].webPreferences.contextIsolation, true);
  assert.equal(calls[0][1].webPreferences.sandbox, true);
  assert.ok(calls.some(([kind, url]) => kind === 'loadURL' && url.includes('phone=5516999999999') && url.includes('text=Teste')));
});
