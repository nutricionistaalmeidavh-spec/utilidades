# Evidência da entrega 0.2.0 — 10/09/2026

Alvo: somente os quatro kits de `utilidades`, sobre a base remota `e74eec8`.
As mudanças remotas de política de custo e remoção de Postiz foram preservadas.
Nenhum consumidor, upstream, deploy ou proteção de branch foi alterado.

| Verificação | Resultado |
|---|---|
| QA: `npm test` | 5 passaram; inclui HTTP real, concorrência, idempotência e limpeza de contextos |
| QA: cenário Playwright/Chromium | 1 passou, com dois contextos de navegador e servidor HTTP real |
| API Contracts: `npm test` | 10 passaram |
| API Contracts: `npm run test:pact` | 1 passou; consumidor/provedor reais e rejeição intencional de contrato incompatível |
| API Contracts: `npm run test:generator` | 1 passou; JAR 7.16.0 real e compilação TypeScript estrita do cliente gerado |
| Documents: `python -m unittest discover -s tests -v` | 11 passaram com Pillow/OpenCV reais |
| Security: `python -m unittest discover -s modules/artisys-security/tests -v` | 7 passaram, incluindo versões, thresholds e falhas bloqueantes |
| Verificação central `scripts/check-modules.py --pact` | catálogo e suítes aprovados; gerador executado também separadamente |
| `npm pack --dry-run` nos dois kits JS | conteúdo dos pacotes aprovado; inclui licença e entrypoints |
| Build wheel de Documents | aprovado |
| YAML dos workflows e `git diff --check` | aprovados |

Total: **36 testes passaram**, contando o teste de browser executado separadamente.

## Ambiente e limites das evidências

- Linux, Node 24.19, Python 3.12. Reteste de Documents: Pillow 11.3.0 e OpenCV 4.11.0.
- O CDN padrão do Playwright estava indisponível. O cenário de browser foi
  executado com o mesmo Playwright 1.62.1 e Chromium 138 disponibilizado pelo pacote
  `@sparticuz/chromium@138.0.2`, em configuração temporária com `executablePath`.
  Nenhuma dependência serverless foi adicionada ao kit. Configuração de produção
  permanece usando o Chromium padrão instalado pelo Playwright. Sua combinação
  exata de browser deve ser testada pelo consumidor.
- O erro inicial no Pact foi diagnosticado no proxy de encaminhamento upstream,
  que não respeita NO_PROXY. O teste local isola o tráfego de loopback no seu
  próprio processo. O módulo não altera proxies do produto.
- A rejeição do provedor incompatível imprime `FAILED` no relatório interno do
  Pact de propósito; o teste exige essa rejeição e termina aprovado.
- Security teve sua orquestração testada com fronteira CLI injetada. Não houve
  scan completo real dos três scanners neste ambiente sem Docker/ferramentas.
  O modo nativo sem scanners foi testado e falhou fechado, como esperado.
- PaddleOCR possui adaptador real, mas inferência/modelos não foram executados.
  Os testes OCR usam fixture somente nessa fronteira; imagens, OpenCV, arquivos
  e regras foram exercitados realmente. Instalação/modelos e acurácia precisam
  de homologação no host consumidor.
- Não foram testados o PDV real, hardware de scanner/impressora, Windows/macOS,
  persistência do produto ou a rede física do cliente.
- O workflow opcional de GitHub não foi executado; os resultados acima são locais.

Os READMEs descrevem como repetir cada verificação. Nenhuma limitação é tratada
como teste aprovado e nenhum serviço pago foi tornado obrigatório.
