# ArtiSys Release Validator — Design

## Objetivo

Criar um módulo reutilizável `artisys-release-validator` no repositório `utilidades` para validar releases de produtos ArtiSys sem depender do computador do usuário. O módulo deve executar localmente ou em CI, com foco em runners Windows efêmeros para produtos desktop, e gerar uma decisão objetiva de `APPROVED` ou `BLOCKED` acompanhada de evidências.

## Escopo

O módulo é genérico. Cada produto fornece um perfil de validação declarando metadados, comandos e cenários específicos. O primeiro consumidor planejado é o `PDV-ARTISYS`, mas nenhuma regra de negócio do PDV fica dentro deste módulo.

Capacidades da primeira versão:

- contrato versionado de perfil por produto;
- orquestração sequencial de fases de release;
- adapters de comandos/processos sem `shell: true`;
- helpers para instalação/desinstalação NSIS no Windows;
- health probe HTTP opcional;
- cenários de produto injetados pelo consumidor;
- stress/repetição configurável;
- coleta de duração, stdout/stderr sanitizados e erros;
- relatórios JSON e HTML;
- SHA-256 dos artefatos validados;
- CLI para uso em GitHub Actions ou localmente;
- bloqueio imediato em fase obrigatória que falhar;
- testes unitários multiplataforma e smoke de Windows no CI do próprio módulo.

## Arquitetura

```text
Consumer profile
      ↓
defineValidationProfile()
      ↓
Validation Runner
      ├── phase runner
      ├── scenario runner
      ├── command adapter
      ├── Windows/NSIS adapter
      ├── HTTP probe
      └── artifact hashing
      ↓
Report builder
      ├── validation-report.json
      └── validation-report.html
```

O runner não conhece Electron, SQLite, caixa, estoque ou qualquer domínio de produto. O consumidor representa esses comportamentos como fases e cenários. Isso permite reutilização em PDV, FluxoDRE, Obra na Mão e outros desktops.

## Contrato do perfil

`defineValidationProfile(profile)` aceita:

- `schemaVersion: 1`;
- `product`: identificador não vazio;
- `version`: versão da release;
- `artifact`: caminho do instalador/artefato principal;
- `workspace`: diretório temporário exclusivo da validação;
- `phases`: lista ordenada de fases;
- `scenarios`: lista de cenários de negócio opcionais;
- `reportDir`: diretório para evidências.

Cada fase/cenário declara `id`, `required`, `timeoutMs` e uma ação executável. A CLI também aceita ações declarativas do tipo `command`, `http` e `nsis` carregadas de um arquivo `.mjs` do consumidor.

## Fases recomendadas

O módulo não força todas as fases, mas documenta a sequência padrão:

1. `install`
2. `boot`
3. `database`
4. `business-scenarios`
5. `stress`
6. `backup-restore`
7. `upgrade`
8. `uninstall`
9. `reinstall`

Uma fase obrigatória que falha bloqueia a release. Fases opcionais podem ser `skipped` sem aprovar capacidades não testadas.

## Segurança e isolamento

- Nenhum daemon, VPS, PC ligado ou runner self-hosted permanente.
- Execução suportada em runners efêmeros do GitHub Actions.
- Processos são iniciados com executável + argumentos separados; `shell: true` é proibido.
- O workspace deve ser explícito e isolado; o runner não apaga diretórios fora dele.
- Segredos não são incluídos nos relatórios; o consumidor pode fornecer lista de padrões a redigir.
- Timeouts são obrigatórios e processos excedidos são encerrados.
- O módulo nunca interpreta `PROTOCOL_VERIFIED` como homologação física; validação de hardware real continua externa ao módulo.

## Resultado

O resultado público é:

```js
{
  status: 'APPROVED' | 'BLOCKED',
  product,
  version,
  artifact: { path, sha256 },
  startedAt,
  finishedAt,
  durationMs,
  phases: [],
  failedRequired: []
}
```

A aprovação exige todas as fases obrigatórias em `pass`. O relatório HTML é uma visualização do mesmo JSON, sem uma segunda fonte de verdade.

## Integração no repositório Utilidades

O módulo seguirá o padrão dos kits existentes:

- `modules/artisys-release-validator/package.json`
- `modules/artisys-release-validator/module.json`
- `modules/artisys-release-validator/src/`
- `modules/artisys-release-validator/tests/`
- `modules/artisys-release-validator/examples/`
- `modules/artisys-release-validator/LICENSE`

Será registrado em `catalog/modules.json`, `modules/README.md`, `docs/MODULE_KITS.md` e `scripts/check-modules.py`.

## Critérios de aceite

- `npm test`, `npm run check`, `npm run example` e `npm pack --dry-run` verdes;
- profile inválido falha antes de executar comandos;
- falha em etapa obrigatória produz `BLOCKED` e interrompe as etapas subsequentes;
- etapa opcional pode falhar/ser ignorada sem mascarar falha obrigatória;
- command adapter aplica timeout e captura stdout/stderr;
- geração de SHA-256 é determinística;
- relatórios JSON/HTML são gerados com o mesmo resultado;
- smoke Windows valida construção do comando silencioso NSIS e execução de processo básico;
- CI global de módulos permanece verde.

## Fora do escopo desta entrega

- integrar o módulo no `PDV-ARTISYS` — isso pertence à E56 do PDV;
- publicar pacote em registry público/privado;
- criar serviço hospedado;
- homologar periféricos físicos;
- assinar executáveis ou substituir `artisys-release`.

`artisys-release` continua responsável por gates gerais de publicação. `artisys-release-validator` fornece a validação executável do artefato instalado e dos cenários do produto.
