# Template ArtiSys Release

O produto consumidor declara **o que executar** em `.artisys/release.json`. A ordem, bloqueios e relatório continuam centralizados em `modules/artisys-release`; diagnóstico e feedback GitHub ficam em `modules/artisys-ci-reporter`.

## Consumo pinado recomendado

Para produtos ArtiSys desktop/Windows, mantenha um único checkout compartilhado de `utilidades` no host e copie para o produto:

- `utilidades.lock.json` → `.artisys/utilidades.lock`
- `product-wrapper.ps1` → `scripts/artisys-release.ps1`
- `release.config.json` → `.artisys/release.json`, substituindo somente comandos reais do produto
- `woodpecker-windows.yaml` → `.woodpecker/artisys-release.yaml`

No host do agente/local configure apenas variáveis de ambiente, nunca segredos no repositório:

```powershell
$env:ARTISYS_UTILIDADES_PATH="C:\Victor\Artisys\utilidades"
$env:GITHUB_REPORT_TOKEN="<host secret>"
```

O wrapper lê `.artisys/utilidades.lock`, exige o SHA pinado, verifica esse commit com `git cat-file`, cria um `git worktree --detach` temporário exatamente no SHA e executa o motor/reporter desse worktree. Ele **não** faz `git pull`, **não** faz checkout de `main` e **não** altera o checkout compartilhado de `utilidades`. Se o commit pinado não existir localmente, a execução falha de forma explícita.

## Ordem canônica

```text
deps → lint → test → build → installer → qa → security → evidence → deploy → publish
```

A ordem `installer → qa` é intencional: o QA valida a execução que produziu o artefato que será entregue.

## Recomendação mínima para desktop

- `deps` obrigatório;
- `test` obrigatório;
- `build` obrigatório;
- `installer` obrigatório;
- `qa` obrigatório e posterior ao instalador;
- `evidence` obrigatório para release certificado;
- `security` recomendado quando configurado;
- Fase 7/banco legado real permanece fora do CI comum.

## Woodpecker

O workflow recomendado usa agente `windows/amd64` com backend `local`. O YAML apenas chama `scripts/artisys-release.ps1`; não deve duplicar comandos de build/test/QA.

A ativação do repositório na interface do Woodpecker continua sendo uma etapa operacional externa: ao ativar o repo, o servidor cria/usa o webhook GitHub e passa a receber eventos `push`/`manual`.

Não habilite PRs/forks não confiáveis no agente `local`, pois os comandos rodam diretamente no Windows host.

## Feedback GitHub

Com `GITHUB_REPORT_TOKEN` disponível no host, o wrapper chama `artisys-ci-reporter` do mesmo SHA pinado. O reporter publica status de sucesso/falha, commit, branch, pipeline, step, exit code, diagnóstico e presença do instalador. Sucesso não gera comentário por padrão, apenas status.

## Dry-run

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\artisys-release.ps1 -DryRun
```

O dry-run valida pin/configuração e plano do pipeline sem gerar `release-run.json` válido para certificação.
