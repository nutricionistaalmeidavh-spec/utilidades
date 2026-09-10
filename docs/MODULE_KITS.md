# Kits executáveis ArtiSys

Os quatro kits executáveis são reutilizáveis e não exigem infraestrutura permanente:

| Módulo | Versão | Execução | Responsabilidade do produto |
|---|---:|---|---|
| QA | 1.1.0 | local ou GitHub Actions | seletores, login e cenários reais |
| Security | 0.2.0 | local ou GitHub Actions | alvo e política de bloqueio |
| API Contracts | 0.2.0 | local ou GitHub Actions | OpenAPI, schemas, Pact e baselines |
| Documents | 0.2.0 | local sob demanda ou GitHub Actions | OCR, classificação, revisão e destino |

Nenhum deles requer servidor, VPS, PC ligado, runner self-hosted ou assinatura externa para funcionar.

## Preparar ambiente local

Node 22+, Python 3.10+; Java 17+ apenas quando o OpenAPI Generator for usado. Não é necessário inicializar os 22 submodules para testar os kits.

```bash
npm ci --ignore-scripts --prefix modules/artisys-qa
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
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

Depois execute `python scripts/check-modules.py --browser --pact`. Para validar o gerador, provisione o JAR fixado conforme o README de API Contracts, defina `OPENAPI_GENERATOR_JAR` e acrescente `--generator`.

## GitHub Actions

O workflow `.github/workflows/module-checks.yml` usa **`ubuntu-latest`**. Não existe requisito de runner self-hosted.

O template `modules/artisys-security/templates/consumer-workflow.yml` também usa runner hospedado pelo GitHub e pode ser copiado para produtos consumidores.

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
- **Security:** Gitleaks, Trivy e Semgrep; falhas e ferramentas ausentes bloqueiam o gate configurado.
- **Contracts:** validação de contratos Pact/OpenAPI e geração de cliente quando solicitada.
- **Documents:** testes de arquivos, pré-processamento e contratos OCR; inferência real e drivers de scanner dependem apenas da máquina onde a tarefa for executada, não de servidor permanente.

`implemented` ou `stable` significa que o kit possui código executável; homologação em cada produto consumidor continua separada.
