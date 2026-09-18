# ArtiSys CI Reporter

Reporter compartilhado de falhas de CI para produtos ArtiSys.

## Objetivo

Publicar automaticamente no GitHub um diagnostico de falha contendo:

- step que falhou;
- exit code e comando quando disponiveis;
- trecho final do erro;
- presenca do instalador;
- link publico do Woodpecker;
- status detalhado no commit;
- comentario no commit;
- comentario opcional no PR aberto.

O modulo nao depende do repositorio do produto estar clonado. Se o workspace ou o relatorio do `artisys-release` nao existirem, ele publica um fallback `clone-or-workflow`.

## Uso no Woodpecker local

O host precisa expor `GITHUB_REPORT_TOKEN` ao processo do Agent e `ARTISYS_UTILIDADES_PATH` precisa apontar para este repositorio.

```powershell
node "$env:ARTISYS_UTILIDADES_PATH\modules\artisys-ci-reporter\bin\artisys-ci-reporter.mjs"
```

Variaveis reconhecidas:

- `CI_REPO`
- `CI_COMMIT_SHA`
- `CI_COMMIT_BRANCH`
- `CI_COMMIT_SOURCE_BRANCH`
- `CI_PIPELINE_URL`
- `CI_WORKSPACE`
- `GITHUB_REPORT_TOKEN`
- `ARTISYS_REPORT_PATH`
- `ARTISYS_LOG_PATH`
- `ARTISYS_INSTALLER_DIR`
- `ARTISYS_INSTALLER_PATTERN`
- `ARTISYS_FAILED_STEP`
- `ARTISYS_FAILURE_MESSAGE`
- `ARTISYS_STATUS_CONTEXT`

## Verificacao

```powershell
Set-Location modules/artisys-ci-reporter
npm test
npm run check
```
