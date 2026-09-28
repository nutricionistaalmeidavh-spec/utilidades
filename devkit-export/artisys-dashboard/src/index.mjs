function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
}

function ownDefined(target, key, value) {
  if (value !== undefined) target[key] = value;
  return target;
}

export function validateDashboardLayout(layout) {
  if (!Array.isArray(layout)) throw new TypeError('layout must be an array');
  const ids = new Set();
  return layout.map((item) => {
    if (!item || typeof item !== 'object') throw new TypeError('layout item must be an object');
    if (typeof item.id !== 'string' || item.id.trim() === '') throw new TypeError('layout item id is required');
    if (ids.has(item.id)) throw new Error(`duplicate dashboard id: ${item.id}`);
    ids.add(item.id);
    for (const key of ['x', 'y', 'w', 'h']) finite(item[key], key);
    if (item.x < 0 || item.y < 0 || item.w <= 0 || item.h <= 0) throw new RangeError('layout coordinates and dimensions are invalid');
    return { ...item };
  });
}

export function toReactGridLayout(layout) {
  return validateDashboardLayout(layout).map((item) => {
    const out = { i: item.id, x: item.x, y: item.y, w: item.w, h: item.h };
    for (const key of ['minW', 'maxW', 'minH', 'maxH', 'static', 'isDraggable', 'isResizable']) ownDefined(out, key, item[key]);
    return out;
  });
}

export function toResizablePanels(panels) {
  if (!Array.isArray(panels)) throw new TypeError('panels must be an array');
  const ids = new Set();
  return panels.map((panel) => {
    if (!panel || typeof panel.id !== 'string' || panel.id.trim() === '') throw new TypeError('panel id is required');
    if (ids.has(panel.id)) throw new Error(`duplicate panel id: ${panel.id}`);
    ids.add(panel.id);
    finite(panel.size, 'size');
    const out = { id: panel.id, defaultSize: panel.size };
    for (const key of ['minSize', 'maxSize', 'collapsible', 'collapsedSize']) ownDefined(out, key, panel[key]);
    return out;
  });
}

export function toGlideColumns(columns) {
  if (!Array.isArray(columns)) throw new TypeError('columns must be an array');
  const ids = new Set();
  return columns.map((column) => {
    if (!column || typeof column.id !== 'string' || column.id.trim() === '') throw new TypeError('column id is required');
    if (ids.has(column.id)) throw new Error(`duplicate column id: ${column.id}`);
    ids.add(column.id);
    if (typeof column.title !== 'string') throw new TypeError('column title is required');
    finite(column.width, 'width');
    const out = { id: column.id, title: column.title, width: column.width };
    for (const key of ['group', 'icon', 'hasMenu', 'grow']) ownDefined(out, key, column[key]);
    return out;
  });
}
