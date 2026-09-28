import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildWhatsAppWebUrl, createTemplateStore } from '../src/index.mjs';

const dir = await mkdtemp(path.join(os.tmpdir(), 'artisys-whatsapp-launcher-'));
try {
  const store = createTemplateStore({ filePath: path.join(dir, 'templates.json') });
  await store.upsert({ id: 'boas-vindas', name: 'Boas-vindas', text: 'Olá {nome}, tudo bem?' });
  const message = await store.render('boas-vindas', { nome: 'Cliente' });
  console.log(buildWhatsAppWebUrl({ phone: '(16) 99999-9999', message }));
} finally {
  await rm(dir, { recursive: true, force: true });
}
