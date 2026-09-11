import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeDocumentConversion, createConversionRequest, executeConversion } from '../src/index.mjs';
test('creates isolated gotenberg request',()=>{ const r=createConversionRequest({input:'invoice.docx',outputFormat:'pdf'}); assert.equal(r.provider,'gotenberg'); assert.equal(r.outputFormat,'pdf'); });
test('rejects unsupported output',()=>assert.throws(()=>normalizeDocumentConversion({input:'a.docx',outputFormat:'exe'}),/output format/));
test('rejects non-PDF output until a provider supports it',()=>assert.throws(()=>normalizeDocumentConversion({input:'a.docx',outputFormat:'png'}),/output format/));
test('executes through adapter',async()=>{ let seen; const result=await executeConversion({convert:async r=>(seen=r,Buffer.from('pdf'))},{input:'a.docx',outputFormat:'pdf'}); assert.equal(result.toString(),'pdf'); assert.equal(seen.provider,'gotenberg'); });
