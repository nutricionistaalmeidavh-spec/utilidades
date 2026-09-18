# ArtiSys CI Reporter 0.3.0

Reporter compartilhado de CI para produtos ArtiSys.

## Objetivo

Publicar automaticamente no GitHub um diagnostico contendo:

- produto, branch, commit e pipeline;
- gates executados e status de cada etapa;
- step, exit code, comando e trecho final do erro quando houver falha;
- presenca do instalador;
- resumo estruturado de QA quando `artifacts/qa-summary.json` estiver disponivel;
- quantidade de fluxos PASS/FAIL;
- nome do fluxo e da etapa que falhou;
- erro do passo de QA e caminhos para screenshot, trace e run-summary;
- status detalhado no commit;
- comentario no commit/PR em falhas;
- status de sucesso sem spam de comentarios por padrao.

O modulo e generico e nao depende de codigo do PDV. Tambem nao depende do repositorio do produto estar clonado: se o workspace ou o relatorio do `artisys-release` nao existirem, publica fallback `clone-or-workflow`.

## Uso no Woodpecker local

O host precisa expor `GITHUB_REPORT_TOKEN` ao processo do Agent e `ARTISYS_UTILIDADES_PATH` precisa apontar para este repositorio.

```powershell
node "$env:ARTISYS_UTILIDADES_PATH\modules\artisys-ci-reporter\bin\artisys-ci-reporter.mjs"
```

Por padrao o CLI publica uma falha. Para registrar sucesso:

```powershell
$env:ARTISYS_CI_RESULT='success'
node "$env:ARTISYS_UTILIDADES_PATH\modules\artisys-ci-reporter\bin\artisys-ci-reporter.mjs"
```

`ARTISYS_COMMENT_SUCCESS=true` tambem comenta sucesso no commit/PR; o padrao e apenas status para evitar ruido.

## Variaveis reconhecidas

- `CI_REPO`
- `CI_COMMIT_SHA`
- `CI_COMMIT_BRANCH`
- `CI_COMMIT_SOURCE_BRANCH`
- `CI_PIPELINE_URL`
- `CI_WORKSPACE`
- `GITHUB_REPORT_TOKEN`
- `ARTISYS_REPORT_PATH`
- `ARTISYS_QA_REPORT_PATH`
- `ARTISYS_LOG_PATH`
- `ARTISYS_INSTALLER_DIR`
- `ARTISYS_INSTALLER_PATTERN`
- `ARTISYS_FAILED_STEP`
- `ARTISYS_FAILURE_MESSAGE`
- `ARTISYS_STATUS_CONTEXT`
- `ARTISYS_CI_RESULT=success|failure`
- `ARTISYS_COMMENT_SUCCESS=true|false`

Se `ARTISYS_QA_REPORT_PATH` nao for informado, o CLI tenta ler `artifacts/qa-summary.json` dentro do workspace.

## Verificacao

```powershell
Set-Location modules/artisys-ci-reporter
npm test
npm run check
```
