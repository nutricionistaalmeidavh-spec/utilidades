# Kits executáveis ArtiSys

Os kits executáveis são reutilizáveis e não exigem infraestrutura permanente.

| Módulo | Versão | Execução | Capacidade principal |
|---|---:|---|---|
| QA | 1.3.0 | local/Actions | E2E, Chromium, evidências, demos e visual opt-in |
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
| Security | 0.2.0 | local/Actions | Gitleaks, Trivy e Semgrep |
| API Contracts | 0.2.0 | local/Actions | OpenAPI + Pact |
| Documents | 0.2.0 | local/Actions | OCR + pré-processamento |
| Video Engine | 0.1.0 | local sob demanda | contrato de vídeo, timeline e adapters de engine |
| Doc Convert | 0.1.0 | local sob demanda | conversão documental isolada via Gotenberg |
| Local Backend | 0.1.0 | local sob demanda | PocketBase local com loopback seguro |
| Remote Support | 0.1.0 | local sob demanda | sessão explícita de suporte RustDesk |
| Release | 0.1.0 | local/Actions | gates, SHA-256 e bloqueio de release |
| Desktop Shell | 0.1.0 | embedded/local | deep links, settings, logs e update hooks |
| OCR | 0.1.0 | embedded/local | seleção PaddleOCR/Tesseract/Tesseract.js |
| Product QA | 0.1.0 | local/Actions | agregação QA + security + API contracts |
| Licensing | 0.1.0 | embedded/local | assinatura Ed25519 e validação offline |

`implemented` ou `stable` significa código executável e verificado no kit; homologação em produto consumidor é separada.

## Verificação

Node 22+, Python 3.10+; Java 17+ apenas para o OpenAPI Generator. Os runtimes GStreamer/MLT/libopenshot, Gotenberg, PocketBase, RustDesk e OCR nativo são opcionais e instalados somente pelos produtos que usam essas capacidades.

```bash
npm ci --ignore-scripts --prefix modules/artisys-qa
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
python3 -m venv .venv
.venv/bin/python -m pip install './modules/artisys-documents[preprocess]'
.venv/bin/python scripts/check-modules.py --browser --pact --generator
```

Os módulos JS executam testes de contrato sem serviço externo obrigatório. Os novos kits também expõem `npm run check`, `npm run example` e `npm pack --dry-run`.

## Segurança de licenciamento

`artisys-licensing` usa Ed25519: a chave privada assina licenças fora do produto distribuído e somente a chave pública é necessária para validação offline. Device binding, produto, expiração e features fazem parte do payload assinado. Revogação continua opcional e exige canal online ou denylist assinada atualizável.

## Regra de entrega

1. Fixar um commit revisado de `utilidades`.
2. Empacotar kits JS com `npm pack`; Documents pode gerar wheel Python.
3. Manter regras, credenciais, dados, chaves privadas e destinos no produto/infra apropriada.
4. Rodar testes do consumidor após integrar.

Não copie upstreams completos para produtos; consuma contratos/adapters ArtiSys.
