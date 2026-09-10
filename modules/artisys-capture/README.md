# ArtiSys Capture

**Status:** stable 1.0.0.

Contrato reutilizável para captura por câmera/arquivo, QR/barcode e pré-processamento OpenCV sem serviço permanente.

## API

- `createCaptureRequest()` — valida `camera|file` + `qr|barcode|document`.
- `normalizeCodeResult()` — normaliza resultados de scanners.
- `scanQrFile()` — fronteira direta para `Html5Qrcode#scanFile`.
- `opencvGrayscale()` / `opencvThreshold()` — operações sobre `cv.Mat`.

O consumidor controla permissões de câmera, UX, armazenamento e vínculo com obra/paciente/produto. Mats retornados pelo OpenCV são do consumidor e devem ser liberados com `delete()`.

```bash
npm test --prefix modules/artisys-capture
npm run example --prefix modules/artisys-capture
```
