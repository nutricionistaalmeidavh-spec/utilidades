import { normalizePdfInputs, normalizeHighlight } from '../src/index.mjs';

console.log(normalizePdfInputs([{ employee: 'Ana', total: 125.5 }]));
console.log(normalizeHighlight({ id: 'h-1', pageNumber: 1, rect: { x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.2 }, text: 'Trecho' }));
