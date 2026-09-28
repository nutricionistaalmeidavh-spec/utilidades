import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const WHATSAPP_WEB_ORIGIN = 'https://web.whatsapp.com';
const TEMPLATE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value.trim();
}

export function normalizePhone(value, { defaultCountryCode = '55' } = {}) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) throw new TypeError('phone is required');
  const country = String(defaultCountryCode ?? '').replace(/\D/g, '');
  const normalized = digits.length === 10 || digits.length === 11 ? `${country}${digits}` : digits;
  if (normalized.length < 8 || normalized.length > 15) throw new TypeError('phone must contain 8 to 15 digits after normalization');
  return normalized;
}

export function renderTemplate(template, variables = {}, { strict = true } = {}) {
  nonEmptyString(template, 'template');
  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) throw new TypeError('variables must be an object');
  const missing = new Set();
  const rendered = template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (token, key) => {
    if (!Object.prototype.hasOwnProperty.call(variables, key) || variables[key] == null) {
      missing.add(key);
      return strict ? token : '';
    }
    return String(variables[key]);
  });
  if (strict && missing.size) throw new TypeError(`missing template variables: ${[...missing].join(', ')}`);
  return rendered;
}

export function buildWhatsAppWebUrl({ phone, message = '', defaultCountryCode = '55' }) {
  const url = new URL('/send', WHATSAPP_WEB_ORIGIN);
  url.searchParams.set('phone', normalizePhone(phone, { defaultCountryCode }));
  if (message !== undefined && message !== null && String(message).length) url.searchParams.set('text', String(message));
  return url.toString();
}

function normalizeTemplate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('template must be an object');
  const id = nonEmptyString(value.id, 'template.id');
  if (!TEMPLATE_ID.test(id)) throw new TypeError('template.id must use letters, numbers, dash or underscore');
  return {
    id,
    name: nonEmptyString(value.name, 'template.name'),
    text: nonEmptyString(value.text, 'template.text')
  };
}

async function readDatabase(filePath) {
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8'));
    return { templates: Array.isArray(data.templates) ? data.templates.map(normalizeTemplate) : [] };
  } catch (error) {
    if (error?.code === 'ENOENT') return { templates: [] };
    throw error;
  }
}

async function writeDatabase(filePath, database) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
  await rename(tmp, filePath);
}

export function createTemplateStore({ filePath }) {
  nonEmptyString(filePath, 'filePath');
  return {
    async list() {
      return (await readDatabase(filePath)).templates;
    },
    async get(id) {
      const normalizedId = nonEmptyString(id, 'template id');
      return (await readDatabase(filePath)).templates.find(item => item.id === normalizedId) ?? null;
    },
    async upsert(value) {
      const template = normalizeTemplate(value);
      const database = await readDatabase(filePath);
      const index = database.templates.findIndex(item => item.id === template.id);
      if (index >= 0) database.templates[index] = template;
      else database.templates.push(template);
      await writeDatabase(filePath, database);
      return template;
    },
    async remove(id) {
      const normalizedId = nonEmptyString(id, 'template id');
      const database = await readDatabase(filePath);
      const next = database.templates.filter(item => item.id !== normalizedId);
      const removed = next.length !== database.templates.length;
      if (removed) await writeDatabase(filePath, { templates: next });
      return removed;
    },
    async render(id, variables, options) {
      const template = await this.get(id);
      if (!template) throw new TypeError(`unknown template: ${id}`);
      return renderTemplate(template.text, variables, options);
    }
  };
}

export function persistentPartition(name = 'artisys-whatsapp-launcher') {
  const cleaned = nonEmptyString(name, 'partition name').replace(/^persist:/, '');
  return `persist:${cleaned}`;
}

export function createWhatsAppWebController({ WebContentsView, parentWindow, partition = persistentPartition() }) {
  if (typeof WebContentsView !== 'function') throw new TypeError('WebContentsView constructor is required');
  if (!parentWindow?.contentView || typeof parentWindow.contentView.addChildView !== 'function') throw new TypeError('parentWindow.contentView.addChildView is required');
  const resolvedPartition = persistentPartition(partition);
  const view = new WebContentsView({
    webPreferences: {
      partition: resolvedPartition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  parentWindow.contentView.addChildView(view);
  return {
    view,
    partition: resolvedPartition,
    setBounds(bounds) {
      view.setBounds(bounds);
    },
    async openHome() {
      await view.webContents.loadURL(WHATSAPP_WEB_ORIGIN);
    },
    async openChat({ phone, message = '', defaultCountryCode = '55' }) {
      await view.webContents.loadURL(buildWhatsAppWebUrl({ phone, message, defaultCountryCode }));
    },
    async clearSession() {
      await view.webContents.session.clearStorageData();
    }
  };
}
