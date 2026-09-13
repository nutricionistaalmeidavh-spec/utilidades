# Kits executáveis ArtiSys

Os kits executáveis são reutilizáveis e não exigem infraestrutura permanente. O core obrigatório deve permanecer R$0/self-hosted; provedores externos são adapters opcionais.

| Módulo | Versão | Execução | Capacidade principal |
|---|---:|---|---|
| QA | 2.4.1 | local/CircleCI | E2E, Chromium, agente local, evidências, demos e visual opt-in |
| PDF | 1.0.0 | embedded/local | geração, visualização e highlights |
| Workflows | 1.0.0 | embedded | grafos, validação e execução |
| Capture | 1.0.0 | embedded | QR/barcode + OpenCV |
| Dashboard | 1.0.0 | embedded | grid, painéis e tabelas |
| Planning | 1.0.0 | embedded | Gantt, calendário e conflitos |
| Media | 1.0.0 | embedded/dev | MediaBunny + Motion Canvas |
| Office | 1.0.0 | embedded/local | DOCX, Univer e PPT jobs |
| UI Builder | 1.0.0 | embedded | GrapesJS, Puck e Craft |
| Upload | 1.0.0 | embedded | política, validação, fila, Uppy e Dropzone |
| Annotations | 1.0.0 | embedded | regiões em imagem/PDF e adapters de anotação |
| SerialPort | 0.1.0 | embedded | dispositivos seriais em Desktop |
| Printing | 0.1.0 | embedded | recibos e impressão térmica |
| Security | 0.2.0 | local/CI | Gitleaks, Trivy e Semgrep |
| API Contracts | 0.2.0 | local/CI | OpenAPI + Pact |
| Documents | 0.2.0 | local/CI | OCR + pré-processamento |
| Video Engine | 0.1.0 | local sob demanda | contrato de vídeo, timeline e adapters de engine |
| Doc Convert | 0.1.0 | local sob demanda | conversão documental isolada via Gotenberg |
| Local Backend | 0.1.0 | local sob demanda | PocketBase local com loopback seguro |
| Remote Support | 0.1.0 | local sob demanda | sessão explícita de suporte RustDesk |
| Release | 0.1.0 | local/CI | gates, SHA-256 e bloqueio de release |
| Release Validator | 0.1.0 | local/CI | instalação, boot, stress, upgrade/uninstall e relatórios |
| Desktop Shell | 0.1.0 | embedded/local | deep links, settings, logs e update hooks |
| OCR | 0.1.0 | embedded/local | seleção PaddleOCR/Tesseract/Tesseract.js |
| Product QA | 0.1.0 | local/CI | agregação QA + security + API contracts |
| Licensing | 0.1.0 | embedded/local | assinatura Ed25519 e validação offline |
| AI Quality | 0.2.0 | local/CI | suites de avaliação, config Promptfoo e resumo de resultados |
| Privacy | 0.2.0 | local/CI | PII, anonymization e redaction por spans |
| BIM | 0.2.0 | local sob demanda | boundary IFC/IfcOpenShell, propriedades e quantidades |
| EventBus | 0.2.0 | embedded/worker | eventos Node/browser, outbox memória/SQLite/D1, BroadcastChannel, SSE e efeitos idempotentes |
| Backup | 0.2.0 | embedded/local | manifesto, SHA-256, retenção e verificação de integridade |
| Importer | 0.1.0 | embedded | mapeamento, preview e validação de importações |
| Finance Domain | 0.1.0 | embedded | fingerprints, regras determinísticas, transferências e conciliação explicável |
| Auth RBAC | 0.2.0 | embedded | papéis, permissões, auth local e sessões independentes de provedor |
| Storage | 0.2.1 | embedded | contrato de storage, memória, SQLite e namespaces |
| Audit Log | 0.1.0 | embedded | trilha append-only de ações e entidades |
| Sync | 0.2.0 | embedded | fila offline persistente, retry e conflitos |
| PWA Runtime | 0.1.0 | embedded | cache versionado, fallback offline e atualização |
| WebView Bridge | 0.1.0 | embedded | envelope e validação WebView ↔ native |
| Inventory | 0.2.0 | embedded | movimentos, reservas, lotes/séries e saldo disponível |
| OS | 0.1.0 | embedded | ordens de serviço com transições configuráveis |
| Catalog | 0.1.0 | embedded | produtos/serviços, variantes, busca e ativação |
| Pricing | 0.1.0 | embedded | preço por quantidade, faixas e descontos |
| Settings | 0.1.0 | embedded | configurações, defaults e namespaces |
| Multitenancy | 0.1.0 | embedded | contexto de tenant, scoping e isolamento |
| Feature Flags | 0.1.0 | embedded | flags por default, tenant e usuário |
| Checklists | 0.1.0 | embedded | itens, evidências, progresso e conclusão |
| Reporting | 0.1.0 | embedded | filtros, agrupamento, agregações e CSV |

`implemented` ou `stable` significa código executável e verificado no kit; homologação em produto consumidor é separada.

## Lotes transversais

**Lote A — infraestrutura:** Backup, Importer, Auth RBAC, Storage, Audit Log, Sync, PWA Runtime e WebView Bridge.

**Lote B — operações reutilizáveis:** Inventory, OS, Catalog, Pricing, Settings, Multitenancy, Feature Flags, Checklists e Reporting.

**Domínio financeiro:** Finance Domain concentra lógica determinística pura e explicável. Parsing de arquivos, OCR, persistência, HTTP, UI e serviços externos permanecem em módulos/adapters separados.

Os módulos dos dois lotes e o Finance Domain têm zero dependências runtime obrigatórias. Persistência real, autenticação externa, serviços cloud, fiscal, pagamentos e regras verticais permanecem nos consumidores ou em adapters opcionais.

## Release e validação de artefato

`artisys-release` coordena gates gerais de publicação como QA, segurança, contratos e assinatura. `artisys-release-validator` atua depois do build sobre o artefato distribuível: instala, executa fases/cenários do consumidor, permite stress e upgrade/uninstall, calcula SHA-256 e gera relatórios JSON/HTML. O segundo não substitui o primeiro e não contém regras específicas de nenhum produto.

## Verificação

Node 22+, Python 3.10+; Java 17+ apenas para o OpenAPI Generator. Runtimes nativos/externos como GStreamer, Gotenberg, PocketBase, RustDesk, Presidio, Promptfoo e IfcOpenShell são opcionais e instalados somente onde a capacidade correspondente é usada.

```bash
npm ci --ignore-scripts --prefix modules/artisys-qa
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
python3 -m venv .venv
.venv/bin/python -m pip install './modules/artisys-documents[preprocess]'
.venv/bin/python scripts/check-modules.py --browser --pact --generator
```

Os módulos JS executam testes de contrato sem serviço externo obrigatório. Kits executáveis expõem `npm test`, `npm run check`, `npm run example` e `npm pack --dry-run` quando aplicável.

## Segurança de licenciamento

`artisys-licensing` usa Ed25519: a chave privada assina licenças fora do produto distribuído e somente a chave pública é necessária para validação offline. Device binding, produto, expiração e features fazem parte do payload assinado. Revogação continua opcional e exige canal online ou denylist assinada atualizável.

## Regra de entrega

1. Fixar um commit revisado de `utilidades`.
2. Empacotar kits JS com `npm pack`; Documents pode gerar wheel Python.
3. Manter regras, credenciais, dados, chaves privadas e destinos no produto/infra apropriada.
4. Rodar testes do consumidor após integrar.

Não copie upstreams completos para produtos; consuma contratos/adapters ArtiSys.
