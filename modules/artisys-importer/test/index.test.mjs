import test from 'node:test'; import assert from 'node:assert/strict'; import { previewImport } from '../src/index.mjs';
test('maps and validates rows',()=>{const out=previewImport([{Nome:'Ana'}],{name:'Nome'},{required:['name']});assert.equal(out.valid,true);assert.equal(out.rows[0].name,'Ana');});
