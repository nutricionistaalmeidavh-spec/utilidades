export function mapRow(row, mapping = {}) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError('row must be an object');
  return Object.fromEntries(Object.entries(mapping).map(([target, source]) => [target, typeof source === 'function' ? source(row) : row[source]]));
}

export function validateRows(rows, schema = {}) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array');
  const required = schema.required ?? [];
  const errors = [];
  rows.forEach((row,index) => required.forEach(field => { if (row?.[field] == null || row[field] === '') errors.push({index,field,code:'required'}); }));
  return { valid: errors.length === 0, errors };
}

export function previewImport(rows, mapping, schema) {
  const mapped = rows.map(row => mapRow(row,mapping));
  return { rows:mapped, ...validateRows(mapped,schema) };
}
