# utilidades

Repositório curado de projetos open source e módulos ArtiSys realmente reutilizáveis nos sistemas ArtiSys/MH.

A regra é simples: um projeto só entra aqui se puder ser usado **sem manter infraestrutura dedicada ligada** e se adicionar uma capacidade de produto concreta. A triagem acontece **antes** de qualquer lista de candidatos ser apresentada.

## Critério de entrada

Aceitamos somente `embedded`, `ci`, `local-on-demand` ou `dev-tool`. Não entram servidores/daemons 24/7, VPS/PC dedicado, serviços pagos obrigatórios, bibliotecas triviais ou projetos sem caminho real de integração. Aplicações completas e projetos com copyleft forte podem ser incorporados como **referência curada/isolada**, sem virar dependência de runtime dos produtos ArtiSys.

O core deve permanecer **R$ 0 / self-hosted / open source**. Serviços pagos podem existir somente como integração opcional explícita, nunca como dependência silenciosa do funcionamento básico.

## Estado atual

- **60 projetos upstream curados**: 49 aprovados como Git submodules + 11 referências incorporadas e pinadas por commit.
- **47 módulos ArtiSys** registrados.
- **47 kits executáveis**: 11 `stable` e 36 `implemented`.
- **0 foundations** pendentes.
- Nenhum projeto incorporado exige infraestrutura always-on mantida pelo usuário por padrão.

## Kits stable

- `artisys-qa` 2.4.1 — Playwright/Chromium, agente local, screenshots, traces, vídeos, demos, evidências e regressão visual opt-in.
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

### Infraestrutura, QA e release

- `artisys-security` 0.2.0 — Gitleaks + Trivy + Semgrep.
- `artisys-api-contracts` 0.2.0 — OpenAPI Generator + Pact JS.
- `artisys-release` 0.1.0 — gates QA/segurança/API/assinatura + SHA-256.
- `artisys-release-validator` 0.1.0 — validação de instalador/release, stress, upgrade e relatórios.
- `artisys-product-qa` 0.1.0 — agregador QA + security + API contracts.
- `artisys-ai-quality` 0.2.0 — regressão/model comparison e configuração Promptfoo sem credenciais embutidas.
- `artisys-privacy` 0.2.0 — PII/anonymization via boundary Presidio + redaction por spans.
- `artisys-backup` 0.1.0 — manifesto de backup, SHA-256 e verificação de integridade.
- `artisys-audit-log` 0.1.0 — trilha append-only de ator, ação, entidade e metadados.

### Desktop, hardware e runtime local

- `artisys-serialport` 0.1.0 — Node SerialPort, dispositivos seriais e hardware Desktop.
- `artisys-printing` 0.1.0 — ReceiptLine + node-thermal-printer.
- `artisys-local-backend` 0.1.0 — PocketBase local com loopback seguro.
- `artisys-remote-support` 0.1.0 — sessões de suporte remoto RustDesk isoladas.
- `artisys-desktop-shell` 0.1.0 — deep links, settings, logs e update hooks.
- `artisys-licensing` 0.1.0 — licenças offline Ed25519, device binding, expiração e features.

### Documentos, OCR, mídia e BIM

- `artisys-documents` 0.2.0 — PaddleOCR + OpenCV.
- `artisys-video-engine` 0.1.0 — jobs/timeline de vídeo + adapters GStreamer/MLT/libopenshot.
- `artisys-doc-convert` 0.1.0 — conversão documental Gotenberg sob demanda.
- `artisys-ocr` 0.1.0 — OCR unificado PaddleOCR/Tesseract/Tesseract.js.
- `artisys-bim` 0.2.0 — boundary IFC/IfcOpenShell, propriedades, quantidades e resumo de entidades.

### Aplicação, dados e integração

- `artisys-eventbus` 0.2.0 — eventos Node/browser, wildcard/once, outbox memória/SQLite/D1, BroadcastChannel, SSE e efeitos idempotentes.
- `artisys-importer` 0.1.0 — mapeamento, preview e validação de importações.
- `artisys-auth-rbac` 0.1.0 — papéis, permissões e guards independentes de provedor.
- `artisys-storage` 0.1.0 — contrato de storage, memória e isolamento por namespace.
- `artisys-sync` 0.1.0 — fila offline, retry e resolução de conflitos.
- `artisys-pwa-runtime` 0.1.0 — cache versionado, precache, fallback e atualização PWA.
- `artisys-webview-bridge` 0.1.0 — envelope e validação WebView ↔ native.
- `artisys-settings` 0.1.0 — configurações, defaults e namespaces independentes de persistência.
- `artisys-multitenancy` 0.1.0 — contexto de tenant, scoping e guard de isolamento.
- `artisys-feature-flags` 0.1.0 — flags locais por default, tenant e usuário.

### Domínio reutilizável

- `artisys-inventory` 0.1.0 — movimentos, reservas e saldo disponível de estoque.
- `artisys-os` 0.1.0 — ordem de serviço genérica com transições configuráveis e histórico.
- `artisys-catalog` 0.1.0 — catálogo de produtos/serviços, variantes, busca e ativação.
- `artisys-pricing` 0.1.0 — preço por quantidade, faixas, desconto e cálculo de linha.
- `artisys-checklists` 0.1.0 — checklist, evidência, progresso e conclusão.
- `artisys-reporting` 0.1.0 — filtros, agrupamento, agregações e CSV.

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
