import { createCaptureRequest, normalizeCodeResult } from '../src/index.mjs';
console.log(createCaptureRequest({ source: 'camera', mode: 'qr' }));
console.log(normalizeCodeResult({ decodedText: 'OBRA-001', result: { format: { formatName: 'QR_CODE' } } }));
