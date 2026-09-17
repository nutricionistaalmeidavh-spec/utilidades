# utilidades

Repositório curado de projetos open source e módulos ArtiSys realmente reutilizáveis nos sistemas ArtiSys/MH.

A regra é simples: um projeto só entra aqui se puder ser usado **sem manter infraestrutura dedicada ligada** e se adicionar uma capacidade de produto concreta. A triagem acontece **antes** de qualquer lista de candidatos ser apresentada.

## Critério de entrada

Aceitamos somente `embedded`, `ci`, `local-on-demand` ou `dev-tool`. Não entram servidores/daemons 24/7, VPS/PC dedicado, serviços pagos obrigatórios, bibliotecas triviais ou projetos sem caminho real de integração. Aplicações completas e projetos com copyleft forte podem ser incorporados como **referência curada/isolada**, sem virar dependência de runtime dos produtos ArtiSys.

O core deve permanecer **R$ 0 / self-hosted / open source**. Serviços pagos podem existir somente como integração opcional explícita, nunca como dependência silenciosa do funcionamento básico.

## Estado atual

- **82 projetos upstream curados**: 49 aprovados como Git submodules + 33 referências incorporadas e pinadas por commit.
- **48 módulos ArtiSys** registrados.
- **48 kits executáveis**: 11 `stable` e 37 `implemented`.
- **0 foundations** pendentes.
- Nenhum projeto incorporado exige infraestrutura always-on mantida pelo usuário por padrão.

O lote mais recente está em `catalog/incorporated-repos-2026-09-16-batch2.json`: 22 seleções aprovadas, sendo 21 novas incorporações e o Semgrep preservado sem duplicação porque já estava integrado.

## Nomenclatura dos módulos

Os IDs técnicos `artisys-*` continuam imutáveis para preservar código e integrações. Para documentação e escolha de módulos, usamos nomes amigáveis em português.

Exemplo: **Comunicação entre Módulos** é o nome de apresentação de `artisys-eventbus`; o código continua importando e referenciando `artisys-eventbus` normalmente.

A fonte completa de nomes, categorias e descrições em pt-BR está em `catalog/module-display.pt-BR.json`. A tabela detalhada fica em `modules/README.md`.

## Catálogo por categoria

### Qualidade e Entrega

- **Testes e Controle de Qualidade** — `artisys-qa`
- **Segurança Automatizada** — `artisys-security`
- **Contratos e Compatibilidade de APIs** — `artisys-api-contracts`
- **Empacotamento e Publicação** — `artisys-release`
- **Validação de Instaladores e Releases** — `artisys-release-validator`
- **Validação Completa do Produto** — `artisys-product-qa`
- **Testes e Qualidade de IA** — `artisys-ai-quality`
- **Privacidade e Proteção de Dados** — `artisys-privacy`

### Documentos e Mídia

- **Geração e Leitura de PDFs** — `artisys-pdf`
- **Áudio, Vídeo e Animações** — `artisys-media`
- **Documentos e Planilhas Office** — `artisys-office`
- **Anotações em Imagens e PDFs** — `artisys-annotations`
- **Leitura e Processamento de Documentos** — `artisys-documents`
- **Processamento e Edição de Vídeo** — `artisys-video-engine`
- **Conversão de Documentos** — `artisys-doc-convert`
- **Reconhecimento de Texto (OCR)** — `artisys-ocr`

### Interface e Produtividade

- **Fluxos de Trabalho Visuais** — `artisys-workflows`
- **Painéis e Indicadores** — `artisys-dashboard`
- **Planejamento e Cronogramas** — `artisys-planning`
- **Construtor de Interfaces** — `artisys-ui-builder`

### Arquivos e Captura

- **Captura por Câmera e Códigos** — `artisys-capture`
- **Envio e Validação de Arquivos** — `artisys-upload`

### Desktop e Hardware

- **Integração com Dispositivos Seriais** — `artisys-serialport`
- **Impressão, Cupons e Etiquetas** — `artisys-printing`
- **Suporte Remoto** — `artisys-remote-support`
- **Estrutura Base para Aplicativos Desktop** — `artisys-desktop-shell`

### Plataforma e Dados

- **Backend Local Embutido** — `artisys-local-backend`
- **Licenciamento Offline** — `artisys-licensing`
- **Comunicação entre Módulos** — `artisys-eventbus`
- **Backup e Restauração** — `artisys-backup`
- **Importação de Dados** — `artisys-importer`
- **Acesso e Permissões** — `artisys-auth-rbac`
- **Armazenamento de Dados** — `artisys-storage`
- **Histórico e Auditoria** — `artisys-audit-log`
- **Sincronização de Dados** — `artisys-sync`
- **Configurações do Sistema** — `artisys-settings`
- **Multiempresa e Isolamento de Dados** — `artisys-multitenancy`
- **Ativação Controlada de Funcionalidades** — `artisys-feature-flags`

### Aplicativos Web e Mobile

- **Aplicativo Web Instalável e Offline** — `artisys-pwa-runtime`
- **Integração Web ↔ Aplicativo** — `artisys-webview-bridge`

### Gestão e Operação

- **Motor Financeiro e Conciliação** — `artisys-finance-domain`
- **Estoque e Movimentações** — `artisys-inventory`
- **Ordens de Serviço** — `artisys-os`
- **Catálogo de Produtos e Serviços** — `artisys-catalog`
- **Preços, Descontos e Combos** — `artisys-pricing`
- **Checklists e Inspeções** — `artisys-checklists`
- **Relatórios e Indicadores** — `artisys-reporting`

### Engenharia e BIM

- **Leitura e Processamento BIM/IFC** — `artisys-bim`

## Repos aprovados por capacidade

- **Documentos/dados:** PaddleOCR, OpenCV, Presidio, PPT Master, PDF.js, pdfme, react-pdf-highlighter, docxjs, Univer, Glide Data Grid, Annotorious, Apache Arrow, DataFusion, Apache Iceberg.
- **UI/fluxos/mapas:** Yjs, bpmn-js, XYFlow, LogicFlow, Rete.js, Storybook, Frappe Gantt, FullCalendar, react-grid-layout, react-resizable-panels, Craft.js, Puck, GrapesJS, MapLibre GL JS.
- **Arquivos/captura:** Uppy, react-dropzone, html5-qrcode.
- **Voz/IA/mídia:** sherpa-onnx, whisper.cpp, WebLLM, Motion Canvas, MediaBunny, vLLM, LiteLLM, DSPy, Haystack, LlamaIndex, PhotoPrism.
- **Hardware/PDV:** Node SerialPort, ReceiptLine, node-thermal-printer.
- **BIM/runtime:** Wasmtime, IfcOpenShell.
- **QA/segurança:** Renovate, Trivy, Semgrep, Gitleaks, Cosign, k6, Playwright, WireMock, Pact JS, OpenAPI Generator, Promptfoo, TruffleHog, Grype, Dependency-Track, CycloneDX CLI, Bandit.
- **Infraestrutura opcional:** NetBird, Sunshine, Gitea.
- **Ferramentas de repositório:** Nx, ripgrep, fzf.
- **Ferramenta interna:** AI Website Cloner Template.

## Referências incorporadas

As referências são pinadas por commit e podem ser usadas para extrair arquitetura, adapters ou funcionalidades, mas continuam opt-in.

### Lote histórico

`catalog/incorporated-repos-2026-09-10.json`

- **Mídia/edição:** GStreamer, MLT, Shotcut, libopenshot.
- **Documentos/OCR:** Gotenberg, Tesseract, Tesseract.js.
- **Desktop:** Microsoft PowerToys, RustDesk.
- **PDV:** OpenSourcePOS.
- **Backend local:** PocketBase.
- **Arquivos/sincronização:** rclone (CLI local opcional, remotes autorizados pelo usuário).

### Lote 472–583

`catalog/incorporated-repos-2026-09-16-batch2.json`

- **Segurança/SBOM:** TruffleHog, Grype, Dependency-Track, CycloneDX CLI, Bandit; Semgrep já existia e não foi duplicado.
- **Mapas:** MapLibre GL JS.
- **IA/RAG:** vLLM, LiteLLM, DSPy, Haystack, LlamaIndex.
- **Ferramentas de desenvolvimento:** Nx, ripgrep, fzf.
- **Dados/analytics:** Apache Arrow, DataFusion, Apache Iceberg.
- **Infraestrutura/suporte:** NetBird, Sunshine, Gitea, PhotoPrism.

Detalhes de consumo e separação de responsabilidades: `docs/UPSTREAM_BATCH_472_583.md`.

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

Veja `docs/SELECTION_POLICY.md`, `catalog/projects.json`, `catalog/modules.json`, `catalog/module-display.pt-BR.json`, `modules/README.md`, `docs/INTEGRATION_GUIDE.md`, `catalog/incorporated-repos-2026-09-16-batch2.json` e `docs/UPSTREAM_BATCH_472_583.md`.
