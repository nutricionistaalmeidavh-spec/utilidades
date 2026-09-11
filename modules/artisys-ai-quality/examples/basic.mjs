import { buildPromptfooConfig } from '../src/index.mjs';
console.log(JSON.stringify(buildPromptfooConfig({ name: 'smoke', providers: ['local'], cases: [{ id: 'hello', prompt: 'Olá', expected: 'Olá' }] }), null, 2));
