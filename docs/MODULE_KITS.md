# Kits executáveis ArtiSys

Os kits executáveis são reutilizáveis e não exigem infraestrutura permanente.

| Módulo | Versão | Execução | Capacidade principal |
|---|---:|---|---|
| QA | 1.1.1 | local/Actions | E2E, Chromium, evidências e demos |
| PDF | 1.0.0 | embedded/local | geração, visualização e highlights |
| Workflows | 1.0.0 | embedded | grafos, validação e execução |
| Capture | 1.0.0 | embedded | QR/barcode + OpenCV |
| Dashboard | 1.0.0 | embedded | grid, painéis e tabelas |
| Planning | 1.0.0 | embedded | Gantt, calendário e conflitos |
| Media | 1.0.0 | embedded/dev | MediaBunny + Motion Canvas |
| Office | 1.0.0 | embedded/local | DOCX, Univer e PPT jobs |
| UI Builder | 1.0.0 | embedded | GrapesJS, Puck e Craft |
| Security | 0.2.0 | local/Actions | Gitleaks, Trivy e Semgrep |
| API Contracts | 0.2.0 | local/Actions | OpenAPI + Pact |
| Documents | 0.2.0 | local/Actions | OCR + pré-processamento |

`implemented` ou `stable` significa código executável e verificado no kit; homologação em produto consumidor é separada.

## Verificação

Node 22+, Python 3.10+; Java 17+ apenas para o OpenAPI Generator.

```bash
npm ci --ignore-scripts --prefix modules/artisys-qa
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
python3 -m venv .venv
.venv/bin/python -m pip install './modules/artisys-documents[preprocess]'
.venv/bin/python scripts/check-modules.py --browser --pact --generator
```

Os seis novos módulos JS não possuem serviço ou pacote externo obrigatório para executar sua suíte de contrato. Os runtimes upstream são injetados/instalados pelo consumidor somente quando aquela capacidade é usada.

## Regra de entrega

1. Fixar um commit revisado de `utilidades`.
2. Empacotar kits JS com `npm pack`; Documents pode gerar wheel Python.
3. Manter regras, credenciais, dados e destinos no produto.
4. Rodar testes do consumidor após integrar.

Não copie os upstreams de `projects/` para produtos.
