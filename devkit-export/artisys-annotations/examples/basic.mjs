import { toAnnotoriousAnnotation, toPdfHighlighter } from '../src/index.mjs';

const image = {
  id: 'issue-1', targetType: 'image', targetId: 'photo-1',
  geometry: { type: 'rect', x: 120, y: 80, width: 240, height: 100 },
  text: 'Trinca encontrada', tags: ['estrutura'],
};

const pdf = {
  id: 'review-1', targetType: 'pdf', targetId: 'contract-1', page: 3,
  geometry: { type: 'rect', x: 0.1, y: 0.3, width: 0.5, height: 0.05, coordinateSpace: 'normalized' },
  text: 'Revisar cláusula', tags: ['revisao'],
};

console.log({ annotorious: toAnnotoriousAnnotation(image), pdfHighlighter: toPdfHighlighter(pdf) });
