import { toReactGridLayout, toGlideColumns } from '../src/index.mjs';
console.log(toReactGridLayout([{ id: 'finance', x: 0, y: 0, w: 6, h: 3 }]));
console.log(toGlideColumns([{ id: 'name', title: 'Nome', width: 180 }]));
