# utilidades

Repositório curado de projetos open source e módulos ArtiSys realmente reutilizáveis nos sistemas ArtiSys/MH.

A regra é simples: um projeto só entra aqui se puder ser usado **sem manter infraestrutura dedicada ligada** e se adicionar uma capacidade de produto concreta. A triagem acontece **antes** de qualquer lista de candidatos ser apresentada.

## Critério de entrada

Aceitamos somente `embedded`, `ci`, `local-on-demand` ou `dev-tool`. Não entram servidores/daemons 24/7, VPS/PC dedicado, serviços pagos obrigatórios, bibliotecas triviais ou projetos sem caminho real de integração.

## Estado atual

- **49 projetos aprovados** como Git submodules em `catalog/projects.json`.
- **19 módulos ArtiSys** registrados.
- **16 kits executáveis**: 11 `stable` e 5 `implemented`.
- **3 foundations** ainda precisam ser promovidas.
- Nenhum projeto aprovado exige infraestrutura always-on mantida pelo usuário.

## Kits stable

- `artisys-qa` 1.2.0 — Playwright/Chromium, screenshots, traces, vídeos e demos.
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

## Outros módulos

- `artisys-serialport` — implemented — Node SerialPort, dispositivos seriais e hardware Desktop.
- `artisys-printing` — implemented — ReceiptLine + node-thermal-printer.
- `artisys-security` — implemented — Gitleaks + Trivy + Semgrep.
- `artisys-documents` — implemented — PaddleOCR + OpenCV.
- `artisys-api-contracts` — implemented — OpenAPI Generator + Pact JS.
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

## Arquitetura

```text
Produto ArtiSys
      ↓
modules/artisys-*
      ↓
adapter / biblioteca / CLI / job CI
      ↓
projects/<upstream>
```

Regras de negócio continuam no consumidor. Os kits deste repositório não são integrados automaticamente aos produtos.

## Clonar

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Veja `docs/SELECTION_POLICY.md`, `catalog/projects.json`, `catalog/modules.json`, `modules/README.md` e `docs/INTEGRATION_GUIDE.md`.
