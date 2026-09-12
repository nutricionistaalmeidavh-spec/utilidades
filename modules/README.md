# Módulos ArtiSys reutilizáveis

Esta pasta contém integrações próprias construídas sobre os upstreams curados em `projects/` e `catalog/incorporated-repos-2026-09-10.json`.

Nenhum módulo pode exigir servidor, daemon, banco dedicado, VPS, PC ligado ou runner self-hosted permanente. Módulos `stable` têm código executável, testes, licença local, exemplo e verificação automatizada; módulos `implemented` já têm contrato/código/testes, mas ainda exigem homologação no produto consumidor.

## Módulos atuais

| Módulo | Estado | Função |
|---|---|---|
| `artisys-qa` 1.3.0 | stable | Playwright/Chromium, evidências, demos e validação visual opt-in |
| `artisys-pdf` 1.0.0 | stable | geração, visualização e anotações PDF |
| `artisys-workflows` 1.0.0 | stable | grafos, dependências e adapters visuais |
| `artisys-capture` 1.0.0 | stable | câmera/arquivo, QR/barcode e OpenCV |
| `artisys-dashboard` 1.0.0 | stable | grids, painéis redimensionáveis e data grid |
| `artisys-planning` 1.0.0 | stable | Gantt, calendário, progresso e conflitos |
| `artisys-media` 1.0.0 | stable | áudio/vídeo e manifestos de motion |
| `artisys-office` 1.0.0 | stable | DOCX, workbook Univer e jobs PPT |
| `artisys-ui-builder` 1.0.0 | stable | schema de páginas + GrapesJS/Puck/Craft |
| `artisys-upload` 1.0.0 | stable | políticas, validação, fila e adapters Uppy/Dropzone |
| `artisys-annotations` 1.0.0 | stable | anotações em imagens/PDF + adapters Annotorious/highlighter |
| `artisys-serialport` 0.1.0 | implemented | Node SerialPort, balança, gaveta e dispositivos seriais |
| `artisys-printing` 0.1.0 | implemented | recibos, ReceiptLine, térmicas e fallback Electron |
| `artisys-security` 0.2.0 | implemented | Gitleaks + Trivy + Semgrep |
| `artisys-documents` 0.2.0 | implemented | PaddleOCR + OpenCV |
| `artisys-api-contracts` 0.2.0 | implemented | OpenAPI Generator + Pact JS |
| `artisys-video-engine` 0.1.0 | implemented | jobs/timeline de vídeo + adapters GStreamer/MLT/libopenshot |
| `artisys-doc-convert` 0.1.0 | implemented | conversão documental sob demanda via Gotenberg |
| `artisys-local-backend` 0.1.0 | implemented | PocketBase local com bind seguro em loopback |
| `artisys-remote-support` 0.1.0 | implemented | sessões de suporte remoto isoladas via RustDesk |
| `artisys-release` 0.1.0 | implemented | gates QA/segurança/API/assinatura e hash de artefatos |
| `artisys-release-validator` 0.1.0 | implemented | validação executável de instalador/release, stress, upgrade e relatórios |
| `artisys-desktop-shell` 0.1.0 | implemented | manifest desktop, deep links, settings, logs e update hooks |
| `artisys-ocr` 0.1.0 | implemented | contrato OCR unificado Paddle/Tesseract/browser |
| `artisys-product-qa` 0.1.0 | implemented | agregador QA + security + API contracts |
| `artisys-licensing` 0.1.0 | implemented | licenças offline Ed25519, expiração, device binding e features |
| `artisys-eventbus` 0.2.0 | implemented | eventos Node/browser, wildcard/once, outbox memória/SQLite/D1, BroadcastChannel, SSE e efeitos idempotentes |
| `artisys-ai-quality` 0.2.0 | implemented | avaliação/regressão de IA e config Promptfoo |
| `artisys-privacy` 0.2.0 | implemented | PII/anonymization com Presidio e redaction por spans |
| `artisys-bim` 0.2.0 | implemented | boundary IFC/IfcOpenShell, propriedades e quantidades |

## Integração

O consumidor usa o contrato ArtiSys. Regras de negócio, persistência, permissões, styling, credenciais e runtimes opcionais continuam no repositório do produto. Não copie upstreams completos para dentro do produto.

Consulte `../docs/MODULE_KITS.md` e `../docs/INTEGRATION_GUIDE.md`.
