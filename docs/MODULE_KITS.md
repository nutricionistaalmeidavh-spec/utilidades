# Kits executáveis ArtiSys 0.2.0

Os quatro módulos são código reutilizável executável. O core é gratuito,
open source e executado localmente. Nenhum deles requer serviço comercial,
assinatura ou conta externa. Modelos, browsers e dependências são provisionados
na instalação; Trivy atualiza uma base pública de vulnerabilidades.

| Módulo | Consumir | Responsabilidade do produto |
|---|---|---|
| QA | pacote npm local `@artisys/qa` | seletores, login e cenários reais |
| Security | CLI Python por checkout fixado | alvo, instalação dos scanners, política de publicação |
| API Contracts | pacote npm local `@artisys/api-contracts` | OpenAPI, schemas, contratos Pact, baseline revisada |
| Documents | wheel Python `artisys-documents` | modelos OCR, classificação, revisão e destino dos arquivos |

Os quatro pacotes são MIT para o código próprio. Licenças upstream permanecem
independentes e estão registradas em `docs/LICENSES.md` e nas distribuições das
dependências. Não redistribua pastas `projects/` junto com os produtos.

## Preparar ambiente de desenvolvimento

Node 22+, Python 3.10+; Java 17+ se for gerar clientes. Não é necessário inicializar
os 47 submodules para testar os kits. No Linux/WSL, na raiz deste checkout:

```bash
npm ci --ignore-scripts --prefix modules/artisys-qa
npm ci --ignore-scripts --prefix modules/artisys-api-contracts
python3 -m venv .venv
.venv/bin/python -m pip install './modules/artisys-documents[preprocess]'
.venv/bin/python scripts/check-modules.py --pact
```

No PowerShell, use `python -m venv .venv` e `.venv\Scripts\python.exe` no lugar de
`.venv/bin/python`. Cada README possui instruções próprias. A compatibilidade
de instalação Windows/macOS e os modelos OCR devem ser validados no host alvo.

Instale Chromium no diretório de QA com `npx --no-install playwright install chromium`.
Depois execute `python scripts/check-modules.py --browser --pact`. Para validar o
gerador também, provisione o JAR fixado conforme o README de API Contracts, defina
`OPENAPI_GENERATOR_JAR` e acrescente `--generator`. Nenhum teste opcional selecionado
é convertido em sucesso se uma dependência estiver ausente.

## Entregar aos consumidores

1. Fixe um commit revisado de `utilidades`.
2. Use `npm pack` no kit JS e instale o `.tgz` no consumidor, ou gere a wheel do
   Documents. Guarde versão/commit e lockfiles no consumidor.
3. Mantenha cenários, schemas, regras e destinos no repositório do produto.
4. Para atualizar, troque o pacote inteiro e rode os testes do consumidor. Não
   copie e personalize fontes do núcleo compartilhado.
5. Security pode ser chamado diretamente de um checkout fixado. O template de
   workflow faz checkout separado e exige um SHA revisado.

Nada aqui altera o PDV, FluxoDRE ou outro sistema automaticamente. O PDV permanece
desktop/rede local. Os exemplos não são um caixa pronto para uso comercial.

## CI e gates

`scripts/check-modules.py` é o caminho local, sem CI obrigatório. O workflow
opcional `.github/workflows/module-checks.yml` é disparado manualmente e usa
`self-hosted` por padrão. O proprietário prepara o runner Linux com Node, Python,
Java, bibliotecas do Chromium, curl e acesso às dependências. `ubuntu-latest` pode
ser escolhido explicitamente, sujeito à franquia/cobrança do GitHub; não é requisito.

`modules/artisys-security/templates/consumer-workflow.yml` cobre commits/PRs e tags
quando adotado no produto. Use runners próprios apenas para código confiável.
Se `utilidades` for privado, o segundo checkout exige credencial de leitura
autorizada para esse repositório, configurada no ambiente do consumidor.
Para bloquear merge configure o check obrigatório; para bloquear release use
`needs: security`. Esses controles não são ativados silenciosamente pelo kit.

Gates Security: segredos e severidade HIGH/CRITICAL bloqueiam commits; MEDIUM também
bloqueia release. Erros e ferramentas ausentes bloqueiam ambos. Isso é um baseline,
não auditoria completa de produto. O workflow de testes dos kits não substitui um
scan real do produto com os três scanners.

## Escopo de validação

- QA: prontidão/cancelamento, limpeza de contextos, concorrência HTTP real,
  idempotência, estoque, cancelamento de venda e caixa do exemplo.
- Contracts: validação estrita, envelope de evento, baseline e CLI; Pact real
  aceita provedor compatível e rejeita tipo monetário incompatível. OpenAPI
  Generator real gera cliente que passa no TypeScript estrito.
- Documents: arquivos e pré-processamento Pillow/OpenCV reais, EXIF, limites,
  regras, contrato Paddle e CLI sem sobrescrita. Inferência real PaddleOCR e
  drivers de scanner não foram homologados; não há detector de assinatura.
- Security: comandos, versões, relatórios, critérios e falhas exercitados por
  testes. O scan completo Gitleaks/Trivy/Semgrep requer ambiente com as ferramentas.

Consulte [evidências da entrega](MODULE_KITS_VERIFICATION.md) para resultados e
limitações observados. `implemented` não significa homologação dos consumidores.
