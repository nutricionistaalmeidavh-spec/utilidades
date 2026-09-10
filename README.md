# utilidades

Repositório curado de projetos open source e módulos ArtiSys realmente reutilizáveis nos sistemas ArtiSys/MH.

A regra é simples: um projeto só entra aqui se puder ser usado **sem manter infraestrutura dedicada ligada** e se adicionar uma capacidade de produto concreta. A triagem acontece **antes** de qualquer lista de candidatos ser apresentada.

## Critério de entrada

Aceitamos somente `embedded`, `ci`, `local-on-demand` ou `dev-tool`. Não entram servidores/daemons 24/7, VPS/PC dedicado, serviços pagos obrigatórios, bibliotecas triviais ou projetos sem caminho real de integração.

## Estado atual

- **49 projetos aprovados** como Git submodules em `catalog/projects.json`.
- **15 módulos ArtiSys** registrados.
- **12 kits executáveis**: 9 `stable` e 3 `implemented`.
- **3 foundations** ainda precisam ser promovidas.
- Nenhum projeto aprovado exige infraestrutura always-on mantida pelo usuário.

## Kits stable

- `artisys-qa` — Playwright/Chromium, screenshots, traces, vídeos e demos.
- `artisys-pdf` — pdfme + PDF.js + highlights/anotações.
- `artisys-workflows` — grafos, validação/execução e adapters XYFlow/LogicFlow/Rete.
- `artisys-capture` — captura camera/arquivo, QR/barcode e helpers OpenCV.
- `artisys-dashboard` — layouts de dashboard, painéis e data grid.
- `artisys-planning` — Gantt, calendário, progresso e conflitos de recurso.
- `artisys-media` — jobs de mídia, MediaBunny e manifestos Motion Canvas.
- `artisys-office` — DOCX, workbook Univer e requests PPT Master.
- `artisys-ui-builder` — páginas/blocos portáveis e adapters GrapesJS/Puck/Craft.

## Outros módulos

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

Regras de negócio continuam no consumidor. Ainda **não existe integração automática desses novos kits em nenhum sistema**.

## Clonar

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Veja `docs/SELECTION_POLICY.md`, `catalog/projects.json`, `catalog/modules.json`, `modules/README.md` e `docs/INTEGRATION_GUIDE.md`.
