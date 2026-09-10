# Kits executáveis ArtiSys

Os seis kits executáveis são reutilizáveis e não exigem infraestrutura permanente:

| Módulo | Versão | Execução | Responsabilidade do produto |
|---|---:|---|---|
| QA | 1.1.1 | local ou GitHub Actions | seletores, login e cenários reais |
| PDF | 1.0.0 | embedded/local | templates de negócio, armazenamento e UI final |
| Workflows | 1.0.0 | embedded/local | tipos de nós, regras de processo, persistência e estilo |
| Security | 0.2.0 | local ou GitHub Actions | alvo e política de bloqueio |
| API Contracts | 0.2.0 | local ou GitHub Actions | OpenAPI, schemas, Pact e baselines |
| Documents | 0.2.0 | local sob demanda ou GitHub Actions | OCR, classificação, revisão e destino |

Nenhum deles requer servidor, VPS, PC ligado, runner self-hosted ou assinatura externa para funcionar.

## Preparar ambiente local

Node 22+, Python 3.10+; Java 17+ apenas quando o OpenAPI Generator for usado. Os módulos PDF e Workflows executam seus testes de contrato sem instalar os runtimes visuais opcionais.

```bash
npm ci --ignore-scripts --prefix modules/artisys-qa
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
npm test --prefix modules/artisys-pdf
npm test --prefix modules/artisys-workflows
python3 -m venv .venv
.venv/bin/python -m pip install './modules/artisys-documents[preprocess]'
.venv/bin/python scripts/check-modules.py --pact
```

No PowerShell, use `python -m venv .venv` e `.venv\Scripts\python.exe`.

Para Chromium:

```bash
cd modules/artisys-qa
npx --no-install playwright install chromium
```

Depois execute `python scripts/check-modules.py --browser --pact`. Para validar o gerador OpenAPI, provisione o JAR fixado conforme o README de API Contracts, defina `OPENAPI_GENERATOR_JAR` e acrescente `--generator`.

## GitHub Actions

O workflow `.github/workflows/module-checks.yml` usa **`ubuntu-latest`**. Não existe requisito de runner self-hosted. `scripts/check-modules.py` inclui os testes e smoke checks de PDF e Workflows.

Se a franquia de GitHub Actions da conta for esgotada, isso afeta apenas a automação de CI; nunca torna o produto dependente de uma máquina mantida ligada.

## Entregar aos consumidores

1. Fixe um commit revisado de `utilidades`.
2. Para kits JS, use `npm pack` e instale o `.tgz` no consumidor; para Documents, gere a wheel Python quando necessário.
3. Mantenha cenários, schemas, regras e destinos no repositório do produto.
4. Atualize substituindo o pacote inteiro e rode os testes do consumidor.
5. Security pode ser executado diretamente de checkout fixado durante GitHub Actions.

Não copie os upstreams de `projects/` para os produtos.

## Gates

- **QA:** testes E2E, Chromium, screenshots, trace, vídeos e demos declarativas.
- **PDF:** contrato de template/input, geração pdfme por adapter, PDF.js, highlights portáveis e CLI.
- **Workflows:** validação de grafo, ciclos, ordem de dependências, execução e adapters XYFlow/LogicFlow/Rete.
- **Security:** Gitleaks, Trivy e Semgrep; falhas e ferramentas ausentes bloqueiam o gate configurado.
- **Contracts:** validação de contratos Pact/OpenAPI e geração de cliente quando solicitada.
- **Documents:** testes de arquivos, pré-processamento e contratos OCR; inferência real e drivers de scanner dependem apenas da máquina onde a tarefa for executada, não de servidor permanente.

`implemented` ou `stable` significa que o kit possui código executável; homologação em cada produto consumidor continua separada.
