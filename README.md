# utilidades

Repositório curado de projetos open source e módulos ArtiSys realmente reutilizáveis nos sistemas ArtiSys/MH.

A regra é simples: um projeto só entra aqui se puder ser usado **sem manter infraestrutura dedicada ligada** e se adicionar uma capacidade de produto concreta. A triagem acontece **antes** de qualquer lista de candidatos ser apresentada.

## Critério de entrada

Aceitamos somente projetos que funcionem em pelo menos um destes modos:

- `embedded` — biblioteca incorporada ao navegador, Node/Electron, .NET, Python ou outro runtime do próprio produto;
- `ci` — ferramenta executável em GitHub Actions/CI;
- `local-on-demand` — processo local iniciado apenas quando necessário pelo Desktop/CLI e encerrado depois;
- `dev-tool` — ferramenta de desenvolvimento que não vira dependência operacional do cliente.

Não entram:

- servidores, daemons, bancos ou stacks Docker que precisem ficar 24/7 ligados;
- projetos que exijam VPS, PC dedicado ou runner self-hosted permanente;
- produtos completos que não ofereçam uma capacidade reutilizável clara para os sistemas ArtiSys;
- serviços pagos, contas cloud ou APIs comerciais como requisito do core;
- bibliotecas genéricas que apenas repetem funções triviais já cobertas pelo stack;
- projetos apenas de referência sem caminho de integração real;
- software source-available/comercial incompatível com um core R$ 0.

## Estado atual

- **32 projetos aprovados** como Git submodules, todos classificados por forma real de execução em `catalog/projects.json`.
- **7 módulos ArtiSys** registrados.
- **4 kits executáveis:** `artisys-qa` 1.1.0, `artisys-security` 0.2.0, `artisys-api-contracts` 0.2.0 e `artisys-documents` 0.2.0.
- Nenhum projeto aprovado exige infraestrutura always-on mantida pelo usuário.

## Projetos aprovados

### Documentos, mídia e dados
- PaddleOCR — OCR local sob demanda.
- OpenCV — visão computacional embutida/local.
- Presidio — detecção e anonimização de PII em job local ou CI.
- PPT Master — geração de apresentações em processo local.
- PDF.js — visualizador PDF embutido.
- Glide Data Grid — grade de dados de alta performance no frontend.
- Annotorious — anotações diretamente sobre imagens.

### Frontend, colaboração, fluxos e planejamento
- Yjs — CRDT embutido; sincronização remota é opcional e não faz parte do core.
- bpmn-js — modelagem BPMN diretamente no frontend.
- XYFlow — editores visuais node-based diretamente no frontend.
- Storybook — laboratório de componentes durante desenvolvimento/CI.
- AI Website Cloner Template — ferramenta interna de reconstrução/análise de interfaces.
- Frappe Gantt — cronograma Gantt embutido.
- FullCalendar — calendário e agenda drag-and-drop embutidos.
- react-grid-layout — dashboards com cards reposicionáveis e redimensionáveis.
- react-resizable-panels — painéis redimensionáveis para layouts de desktop/web.

### Arquivos, upload e captura
- Uppy — uploader modular; serviços externos do ecossistema são opcionais e não fazem parte do core aprovado.
- react-dropzone — seleção e drag-and-drop de arquivos no frontend.
- html5-qrcode — leitura de QR/barcode no navegador usando câmera ou arquivos.

### Desktop, plugins e BIM
- Wasmtime — runtime WebAssembly embutível.
- IfcOpenShell — processamento IFC local sob demanda para CompatibilizaBIM/CBIM.

### Segurança, qualidade e automação
- Renovate — automação de dependências via CI.
- Trivy — vulnerabilidades/SBOM via CI.
- Semgrep — análise estática via CI.
- Gitleaks — detecção de secrets via CI.
- Cosign — assinatura/verificação de artefatos via CI.
- k6 — testes de carga via CI.
- Playwright — testes E2E/Chromium e geração de demos via CI.
- WireMock — mock de APIs somente durante testes.
- Pact JS — contract testing via CI.
- OpenAPI Generator — geração de clientes/SDKs via CI.
- Promptfoo — testes de qualidade e regressão de IA via CI.

## Módulos ArtiSys

- `artisys-qa` — Playwright/Chromium, screenshots, traces, vídeos e fluxos de demo.
- `artisys-security` — Gitleaks + Trivy + Semgrep.
- `artisys-documents` — PaddleOCR + OpenCV.
- `artisys-api-contracts` — OpenAPI Generator + Pact JS.
- `artisys-ai-quality` — Promptfoo.
- `artisys-privacy` — Presidio executado localmente sob demanda ou em CI.
- `artisys-bim` — IfcOpenShell executado localmente sob demanda.

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

Nunca copiar um upstream inteiro para dentro de um produto. Regras de negócio continuam no consumidor.

## Clonar

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Veja `docs/SELECTION_POLICY.md`, `catalog/projects.json`, `catalog/modules.json`, `modules/README.md`, `docs/INTEGRATION_GUIDE.md` e `docs/LICENSES.md` antes de promover uma utilidade para outro sistema.
