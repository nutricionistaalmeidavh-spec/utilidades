function asArray(value, name = 'items') {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function selectorFunction(selector) {
  if (typeof selector === 'function') return selector;
  if (typeof selector === 'string' && selector) return item => item?.[selector];
  throw new TypeError('selector must be a function or property name');
}

function keyFunction(selector = 'id') {
  if (typeof selector === 'function') return selector;
  if (typeof selector === 'string' && selector) return item => item?.[selector];
  if (selector == null) return () => null;
  throw new TypeError('keySelector must be a function, property name or null');
}

function logicalItems(items, options = {}) {
  const source = asArray(items);
  const getKey = keyFunction(options.keySelector ?? 'id');
  const seen = new Set();
  const logical = [];
  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    const rawKey = getKey(item, index);
    const hasKey = rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '';
    if (!hasKey) {
      logical.push(item);
      continue;
    }
    const key = `${typeof rawKey}:${String(rawKey)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    logical.push(item);
  }
  return logical;
}

export function countBy(items, selector, options = {}) {
  const pick = selectorFunction(selector);
  const counts = {};
  for (const item of logicalItems(items, options)) {
    const raw = pick(item);
    const key = raw == null || String(raw).trim() === '' ? (options.emptyKey ?? 'unknown') : String(raw);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function summarizeCollection(items, options = {}) {
  const source = asArray(items);
  const logical = logicalItems(source, options);
  const requestedLimit = options.itemLimit == null ? logical.length : Number(options.itemLimit);
  if (!Number.isFinite(requestedLimit) || requestedLimit < 0) throw new RangeError('itemLimit must be a non-negative finite number');
  const itemLimit = Math.floor(requestedLimit);
  const visibleItems = logical.slice(0, itemLimit);
  const groupBy = options.groupBy ?? ['status'];
  const aggregates = {};
  for (const group of groupBy) {
    const name = typeof group === 'string' ? group : group?.name;
    const selector = typeof group === 'string' ? group : group?.selector;
    if (!name || !selector) throw new TypeError('groupBy entries must be property names or {name, selector}');
    aggregates[name] = countBy(logical, selector, { keySelector: null, emptyKey: options.emptyGroupKey ?? 'unknown' });
  }
  const complete = options.complete !== false;
  const truncated = options.truncated ?? visibleItems.length < logical.length;
  return {
    total: logical.length,
    uniqueTotal: logical.length,
    physicalTotal: source.length,
    complete,
    truncated: Boolean(truncated),
    returnedItems: visibleItems.length,
    aggregates,
    items: visibleItems,
  };
}

function countIntent(question) {
  const q = normalizeText(question);
  return /\b(quantos?|quantidade|numero|total|count|how many)\b/.test(q);
}

function statusIntent(question) {
  const q = normalizeText(question);
  if (/\b(stable|estavel|estaveis)\b/.test(q)) return 'stable';
  if (/\b(implemented|implementado|implementados|implementada|implementadas)\b/.test(q)) return 'implemented';
  return null;
}

function answerFor(value, status, options = {}) {
  const entity = options.entityPlural ?? 'módulos';
  if (status === 'stable') return `Temos ${value} ${entity} estáveis.`;
  if (status === 'implemented') return `Temos ${value} ${entity} implementados.`;
  return `Temos ${value} ${entity}.`;
}

export function resolveAggregateQuestion(question, summary, options = {}) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) throw new TypeError('summary must be an object');
  if (!countIntent(question)) return { resolved: false, reason: 'not-an-aggregate-question' };
  if (summary.complete !== true) return { resolved: false, reason: 'collection-incomplete' };
  const status = statusIntent(question);
  if (status) {
    const value = summary.aggregates?.status?.[status];
    if (!Number.isFinite(value)) return { resolved: false, reason: 'aggregate-unavailable', key: `status.${status}` };
    return {
      resolved: true,
      kind: 'count',
      key: `status.${status}`,
      value,
      answer: answerFor(value, status, options),
      provenance: 'deterministic',
    };
  }
  if (!Number.isFinite(summary.total)) return { resolved: false, reason: 'total-unavailable' };
  return {
    resolved: true,
    kind: 'count',
    key: 'total',
    value: summary.total,
    answer: answerFor(summary.total, null, options),
    provenance: 'deterministic',
  };
}

export function isAggregateQuestion(question) {
  return countIntent(question);
}
