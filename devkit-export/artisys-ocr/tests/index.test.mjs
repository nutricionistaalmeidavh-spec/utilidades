import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeOcrRequest, selectOcrProvider, normalizeOcrResult, executeOcr } from '../src/index.mjs';
test('selects browser tesseract when available',()=>{ const p=selectOcrProvider({source:'img.png',environment:'browser'},{'tesseract-js':true,tesseract:true,paddleocr:true}); assert.equal(p,'tesseract-js'); });
test('selects paddle for structured documents',()=>{ const p=selectOcrProvider({source:'doc.png',mode:'structured'},{paddleocr:true,tesseract:true}); assert.equal(p,'paddleocr'); });
test('normalizes OCR result',()=>{ const r=normalizeOcrResult({text:' hi ',confidence:91,blocks:[]},'tesseract'); assert.equal(r.text,'hi'); assert.equal(r.provider,'tesseract'); });
test('executes selected provider',async()=>{ const providers={tesseract:{recognize:async()=>({text:'ok',confidence:.9})}}; const r=await executeOcr(providers,{source:'x',prefer:'tesseract'}); assert.equal(r.text,'ok'); });
