function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} is required`);
  return value;
}

function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function normalizeRect(geometry) {
  if (!geometry || typeof geometry !== 'object' || geometry.type !== 'rect') throw new TypeError('geometry must be a rect');
  const rect = {
    type: 'rect',
    x: finite(geometry.x, 'geometry.x'),
    y: finite(geometry.y, 'geometry.y'),
    width: finite(geometry.width, 'geometry.width'),
    height: finite(geometry.height, 'geometry.height'),
  };
  if (rect.width <= 0 || rect.height <= 0) throw new RangeError('geometry width and height must be positive');
  if (geometry.coordinateSpace !== undefined) {
    if (!['pixel', 'normalized'].includes(geometry.coordinateSpace)) throw new TypeError('coordinateSpace must be pixel or normalized');
    rect.coordinateSpace = geometry.coordinateSpace;
  }
  return rect;
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) throw new TypeError('tags must be an array');
  return [...new Set(tags.map((tag) => requiredString(tag, 'tag').trim()))];
}

export function normalizeAnnotation(input) {
  if (!input || typeof input !== 'object') throw new TypeError('annotation must be an object');
  const targetType = requiredString(input.targetType, 'targetType');
  if (!['image', 'pdf'].includes(targetType)) throw new TypeError('targetType must be image or pdf');
  const out = {
    id: requiredString(input.id, 'id'),
    targetType,
    targetId: requiredString(input.targetId, 'targetId'),
    geometry: normalizeRect(input.geometry),
    text: typeof input.text === 'string' ? input.text : '',
    tags: normalizeTags(input.tags ?? []),
  };
  if (targetType === 'pdf') {
    if (!Number.isInteger(input.page) || input.page <= 0) throw new RangeError('pdf annotation page must be a positive integer');
    out.page = input.page;
  }
  for (const key of ['author', 'createdAt', 'updatedAt']) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

function bodies(annotation) {
  const out = [];
  if (annotation.text) out.push({ type: 'TextualBody', purpose: 'commenting', value: annotation.text });
  for (const tag of annotation.tags) out.push({ type: 'TextualBody', purpose: 'tagging', value: tag });
  return out;
}

export function toAnnotoriousAnnotation(input) {
  const annotation = normalizeAnnotation(input);
  if (annotation.targetType !== 'image') throw new TypeError('Annotorious adapter requires an image annotation');
  const g = annotation.geometry;
  const unit = g.coordinateSpace === 'normalized' ? 'percent' : 'pixel';
  const scale = unit === 'percent' ? 100 : 1;
  return {
    id: annotation.id,
    type: 'Annotation',
    body: bodies(annotation),
    target: {
      source: annotation.targetId,
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `xywh=${unit}:${g.x * scale},${g.y * scale},${g.width * scale},${g.height * scale}`,
      },
    },
  };
}

export function fromAnnotoriousAnnotation(input, options = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('Annotorious annotation must be an object');
  const value = input.target?.selector?.value;
  const match = typeof value === 'string' ? value.match(/^xywh=(pixel|percent):(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/) : null;
  if (!match) throw new TypeError('unsupported Annotorious rectangle selector');
  const unit = match[1];
  const scale = unit === 'percent' ? 100 : 1;
  const geometry = {
    type: 'rect',
    x: Number(match[2]) / scale,
    y: Number(match[3]) / scale,
    width: Number(match[4]) / scale,
    height: Number(match[5]) / scale,
  };
  if (unit === 'percent') geometry.coordinateSpace = 'normalized';
  const body = Array.isArray(input.body) ? input.body : input.body ? [input.body] : [];
  const textBody = body.find((item) => item?.purpose === 'commenting');
  const tags = body.filter((item) => item?.purpose === 'tagging').map((item) => item.value);
  return normalizeAnnotation({
    id: input.id,
    targetType: 'image',
    targetId: options.targetId ?? input.target?.source,
    geometry,
    text: textBody?.value ?? '',
    tags,
  });
}

export function toPdfHighlighter(input) {
  const annotation = normalizeAnnotation(input);
  if (annotation.targetType !== 'pdf') throw new TypeError('PDF highlighter adapter requires a pdf annotation');
  const g = annotation.geometry;
  return {
    id: annotation.id,
    content: { text: annotation.text },
    comment: { text: annotation.text, emoji: '' },
    tags: [...annotation.tags],
    position: {
      pageNumber: annotation.page,
      boundingRect: { x: g.x, y: g.y, width: g.width, height: g.height },
      rects: [],
      ...(g.coordinateSpace !== undefined ? { coordinateSpace: g.coordinateSpace } : {}),
    },
  };
}

export function fromPdfHighlighter(input, options = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('PDF highlight must be an object');
  const rect = input.position?.boundingRect;
  if (!rect) throw new TypeError('PDF highlight boundingRect is required');
  const geometry = { type: 'rect', x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  if (input.position.coordinateSpace !== undefined) geometry.coordinateSpace = input.position.coordinateSpace;
  return normalizeAnnotation({
    id: input.id,
    targetType: 'pdf',
    targetId: options.targetId,
    page: input.position.pageNumber,
    geometry,
    text: input.content?.text ?? input.comment?.text ?? '',
    tags: input.tags ?? [],
  });
}

export function filterAnnotations(items, filter = {}) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  return items.map(normalizeAnnotation).filter((annotation) => {
    if (filter.targetId !== undefined && annotation.targetId !== filter.targetId) return false;
    if (filter.targetType !== undefined && annotation.targetType !== filter.targetType) return false;
    if (filter.page !== undefined && annotation.page !== filter.page) return false;
    if (filter.tag !== undefined && !annotation.tags.includes(filter.tag)) return false;
    return true;
  });
}
