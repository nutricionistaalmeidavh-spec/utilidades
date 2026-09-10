const KINDS = new Set(['docx', 'xlsx', 'pptx', 'document', 'sheet', 'presentation']);

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} is required`);
  return value;
}

export function createOfficeDocument({ kind, source, title = '', metadata = {} }) {
  if (!KINDS.has(kind)) throw new TypeError('kind must be docx, xlsx, pptx, document, sheet or presentation');
  if (source == null || source === '') throw new TypeError('source is required');
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new TypeError('metadata must be an object');
  return { kind, source, title: String(title), metadata: { ...metadata } };
}

export async function renderDocx(runtime, data, bodyContainer, styleContainer = null, options = {}) {
  if (!runtime || typeof runtime.renderAsync !== 'function') throw new TypeError('docxjs runtime must expose renderAsync');
  if (data == null) throw new TypeError('document data is required');
  if (!bodyContainer) throw new TypeError('body container is required');
  return runtime.renderAsync(data, bodyContainer, styleContainer, options);
}

export function toUniverWorkbook({ id, name, sheets }) {
  requiredString(id, 'workbook id');
  requiredString(name, 'workbook name');
  if (!Array.isArray(sheets) || sheets.length === 0) throw new TypeError('sheets must be a non-empty array');
  const sheetOrder = [];
  const sheetMap = {};
  for (const sheet of sheets) {
    requiredString(sheet.id, 'sheet id');
    requiredString(sheet.name, 'sheet name');
    if (sheetMap[sheet.id]) throw new Error(`duplicate sheet id: ${sheet.id}`);
    if (!Array.isArray(sheet.rows)) throw new TypeError('sheet rows must be an array');
    const cellData = {};
    let columnCount = 0;
    sheet.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) throw new TypeError('each sheet row must be an array');
      columnCount = Math.max(columnCount, row.length);
      cellData[rowIndex] = {};
      row.forEach((value, columnIndex) => { cellData[rowIndex][columnIndex] = { v: value }; });
    });
    sheetOrder.push(sheet.id);
    sheetMap[sheet.id] = { id: sheet.id, name: sheet.name, rowCount: sheet.rows.length, columnCount, cellData };
  }
  return { id, name, sheetOrder, sheets: sheetMap };
}

export function createPptMasterRequest({ source, output, theme }) {
  requiredString(source, 'source');
  requiredString(output, 'output');
  const request = { tool: 'ppt-master', source, output };
  if (theme !== undefined) request.theme = requiredString(theme, 'theme');
  return request;
}
