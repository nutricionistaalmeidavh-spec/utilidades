# utilidades

Repositório curado de projetos open source e módulos ArtiSys realmente reutilizáveis nos sistemas ArtiSys/MH.

A regra é simples: um projeto só entra aqui se puder ser usado **sem manter infraestrutura dedicada ligada** e se adicionar uma capacidade de produto concreta. A triagem acontece **antes** de qualquer lista de candidatos ser apresentada.

## Critério de entrada

Aceitamos somente `embedded`, `ci`, `local-on-demand` ou `dev-tool`. Não entram servidores/daemons 24/7, VPS/PC dedicado, serviços pagos obrigatórios, bibliotecas triviais ou projetos sem caminho real de integração. Aplicações completas e projetos com copyleft forte podem ser incorporados como **referência curada/isolada**, sem virar dependência de runtime dos produtos ArtiSys.

## Estado atual

- **60 projetos upstream curados**: 49 aprovados como Git submodules + 11 referências incorporadas e pinadas por commit.
- **28 módulos ArtiSys** registrados.
- **25 kits executáveis**: 11 `stable` e 14 `implemented`.
- **3 foundations** ainda precisam ser promovidas.
- Nenhum projeto incorporado exige infraestrutura always-on mantida pelo usuário por padrão.

## Kits stable

- `artisys-qa` 1.3.0 — Playwright/Chromium, screenshots, traces, vídeos, demos e regressão visual opt-in.
- `artisys-pdf` 1.0.0 — pdfme + PDF.js + highlights/anotações.
- `artisys-workflows` 1.0.0 — grafos, validação/execução e adapters XYFlow/LogicFlow/Rete.
- `artisys-capture` 1.0.0 — captura câmera/arquivo, QR/barcode e helpers OpenCV.
- `artisys-dashboard` 1.0.0 — layouts de dashboard, painéis e data grid.
- `artisys-planning` 1.0.0 — Gantt, calendário, progresso e conflitos de recurso.
- `artisys-media` 1.0.0 — jobs de mídia, MediaBunny e manifestos Motion Canvas.
- `artisys-office` 1.0.0 — DOCX, workbook Univer e requests PPT Master.
- `artisys-ui-builder` 1.0.0 — páginas/blocos portáveis e adapters GrapesJS/Puck/Craft.
- `artisys-upload` 1.0.0 — políticas, validação, fila e adapters Uppy/react-dropzone.
- `artisys-annotations` 1.0.0 — anotações portáveis em imagens/PDF e adapters de UI.

## Outros módulos executáveis

- `artisys-serialport` — implemented — Node SerialPort, dispositivos seriais e hardware Desktop.
- `artisys-printing` — implemented — ReceiptLine + node-thermal-printer.
- `artisys-security` — implemented — Gitleaks + Trivy + Semgrep.
- `artisys-documents` — implemented — PaddleOCR + OpenCV.
- `artisys-api-contracts` — implemented — OpenAPI Generator + Pact JS.
- `artisys-video-engine` — implemented — jobs/timeline de vídeo + adapters GStreamer/MLT/libopenshot.
- `artisys-doc-convert` — implemented — conversão documental Gotenberg sob demanda.
- `artisys-local-backend` — implemented — PocketBase local com loopback seguro.
- `artisys-remote-support` — implemented — sessões de suporte remoto RustDesk isoladas.
- `artisys-release` — implemented — gates QA/segurança/API/assinatura + SHA-256.
- `artisys-desktop-shell` — implemented — deep links, settings, logs e update hooks.
- `artisys-ocr` — implemented — OCR unificado PaddleOCR/Tesseract/Tesseract.js.
- `artisys-product-qa` — implemented — agregador QA + security + API contracts.
- `artisys-licensing` — implemented — licenças offline Ed25519, device binding, expiração e features.

## Foundations

- `artisys-ai-quality` — foundation — Promptfoo.
- `artisys-privacy` — foundation — Presidio local/CI.
- `artisys-bim` — foundation — IfcOpenShell local sob demanda.

## Repos aprovados por capacidade

- **Documentos/dados:** PaddleOCR, OpenCV, Presidio, PPT Master, PDF.js, pdfme, react-pdf-highlighter, docxjs, Univer, Glide Data Grid, Annotorious.
- **UI/fluxos:** Yjs, bpmn-js, XYFlow, LogicFlow, Rete.js, Storybook, Frappe Gantt, FullCalendar, react-grid-layout, react-resizable-panels, Craft.js, Puck, GrapesJS.
- **Arquivos/captura:** Uppy, react-dropzone, html5-qrcode.
- **Voz/IA/mídia:** sherpa-onnx, whisper.cpp, WebLLM, Motion Canvas, MediaBunny.
- **Hardware/PDV:** Node SerialPort, ReceiptLine, node-thermal-printer.
- **BIM/runtime:** Wasmtime, IfcOpenShell.
- **QA/segurança:** Renovate, Trivy, Semgrep, Gitleaks, Cosign, k6, Playwright, WireMock, Pact JS, OpenAPI Generator, Promptfoo.
- **Ferramenta interna:** AI Website Cloner Template.

## Referências incorporadas

Estas referências estão salvas em `catalog/incorporated-repos-2026-09-10.json`, com branch e commit pinados. Podem ser usadas para extrair arquitetura, adapters ou funcionalidades, mas continuam opt-in.

- **Mídia/edição:** GStreamer, MLT, Shotcut, libopenshot.
- **Documentos/OCR:** Gotenberg, Tesseract, Tesseract.js.
- **Desktop:** Microsoft PowerToys, RustDesk.
- **PDV:** OpenSourcePOS.
- **Backend local:** PocketBase.

## Arquitetura

```text
Produto ArtiSys
      ↓
modules/artisys-* / adapter / referência isolada
      ↓
catálogo curado
      ↓
projects/<upstream> ou catalog/incorporated-*.json
```

Regras de negócio continuam no consumidor. Os kits e referências deste repositório não são integrados automaticamente aos produtos.

## Clonar

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Veja `docs/SELECTION_POLICY.md`, `catalog/projects.json`, `catalog/incorporated-repos-2026-09-10.json`, `catalog/modules.json`, `modules/README.md` e `docs/INTEGRATION_GUIDE.md`.
