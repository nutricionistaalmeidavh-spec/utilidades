import { redactSpans } from '../src/index.mjs';
console.log(redactSpans('Ana 123', [{ start: 0, end: 3, entityType: 'PERSON' }, { start: 4, end: 7, entityType: 'CPF' }]));
