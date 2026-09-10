# ArtiSys Upload

**Status:** stable 1.0.0.

Kit reutilizável para políticas de upload, validação de lotes, fila portável e adapters para Uppy e react-dropzone. O módulo não exige Companion, Transloadit, servidor dedicado ou serviço pago.

## API

- `validateUploadPolicy()` — normaliza limites e tipos permitidos.
- `normalizeUploadFile()` — cria metadados portáveis de arquivo.
- `validateUploadBatch()` — separa arquivos aceitos/rejeitados com motivos.
- `createUploadQueue()` — gera fila de upload independente do transporte.
- `createUppyConfig()` — gera `restrictions` para Uppy sem serviço remoto obrigatório.
- `toDropzoneOptions()` — gera opções para react-dropzone.

O consumidor controla autenticação, destino do upload, persistência, retomada e regras de negócio.

```bash
npm test --prefix modules/artisys-upload
npm run example --prefix modules/artisys-upload
```
