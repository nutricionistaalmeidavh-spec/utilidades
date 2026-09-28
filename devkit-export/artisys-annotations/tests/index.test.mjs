import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAnnotation,
  toAnnotoriousAnnotation,
  fromAnnotoriousAnnotation,
  toPdfHighlighter,
  fromPdfHighlighter,
  filterAnnotations,
} from '../src/index.mjs';

const image = {
  id: 'ann-1', targetType: 'image', targetId: 'photo-1',
  geometry: { type: 'rect', x: 10, y: 20, width: 30, height: 40 },
  text: 'trinca', tags: ['estrutura'],
};

const pdf = {
  id: 'ann-2', targetType: 'pdf', targetId: 'contract-1', page: 2,
  geometry: { type: 'rect', x: 0.1, y: 0.2, width: 0.3, height: 0.04, coordinateSpace: 'normalized' },
  text: 'revisar cláusula', tags: ['revisao'],
};

test('normalizes portable annotations', () => {
  const normalized = normalizeAnnotation(image);
  assert.equal(normalized.targetType, 'image');
  assert.deepEqual(normalized.tags, ['estrutura']);
});

test('round-trips image annotation through Annotorious adapter', () => {
  const adapted = toAnnotoriousAnnotation(image);
  assert.match(adapted.target.selector.value, /^xywh=pixel:/);
  const restored = fromAnnotoriousAnnotation(adapted, { targetId: 'photo-1' });
  assert.equal(restored.id, 'ann-1');
  assert.deepEqual(restored.geometry, image.geometry);
  assert.equal(restored.text, 'trinca');
});

test('round-trips PDF annotation through react-pdf-highlighter adapter', () => {
  const adapted = toPdfHighlighter(pdf);
  assert.equal(adapted.position.pageNumber, 2);
  const restored = fromPdfHighlighter(adapted, { targetId: 'contract-1' });
  assert.equal(restored.id, 'ann-2');
  assert.equal(restored.page, 2);
  assert.deepEqual(restored.geometry, pdf.geometry);
});

test('filters by target and tag', () => {
  const result = filterAnnotations([image, pdf], { targetId: 'photo-1', tag: 'estrutura' });
  assert.deepEqual(result.map((item) => item.id), ['ann-1']);
});
