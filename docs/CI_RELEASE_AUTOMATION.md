# Automação de CI e Release ArtiSys

## Objetivo

Uma única definição de pipeline deve funcionar no terminal, no CircleCI, no GitHub Actions/`act` e no Woodpecker. A lógica fica em `modules/artisys-release`; os provedores apenas chamam o CLI.

## Ordem canônica

```text
deps → lint → test → build → installer → qa → security → evidence → deploy → publish
```

A ordem `installer → qa` é intencional: o QA deve validar o artefato que será entregue, não apenas o código-fonte.

## Perfis

- `quick`: dependências, lint, testes e build.
- `full`: adiciona instalador, QA e segurança.
- `release`: adiciona evidências, deploy e publicação.

Etapas ausentes são opcionais por padrão. Use `requiredSteps` para impedir release quando uma etapa obrigatória não estiver configurada.

## Execução local no Windows

```powershell
.\scripts\artisys-release.ps1 -Config .artisys\release.json -Profile release
```

Dry-run:

```powershell
.\scripts\artisys-release.ps1 -Config .artisys\release.json -Profile release -DryRun
```

## `act`

O workflow `.github/workflows/artisys-release-manual.yml` é somente manual e não consome GitHub Actions por push automaticamente. Para executar o mesmo workflow no computador com `act`:

```powershell
act workflow_dispatch -W .github/workflows/artisys-release-manual.yml --input profile=quick
```

A lógica executada continua sendo `artisys-release`; `act` apenas reproduz o ambiente do GitHub Actions localmente.

## CircleCI

O CircleCI permanece suportado, porém está **opt-in** enquanto o executor remoto da conta estiver bloqueado. O parâmetro de pipeline `run_ci` tem `default: false`, então pushes comuns não criam jobs nem consomem créditos.

Para executar o workflow no CircleCI quando a conta estiver disponível novamente, dispare o pipeline pela interface/API com:

```json
{
  "parameters": {
    "run_ci": true
  }
}
```

Quando ativado, o job `release_pipeline` chama exatamente o mesmo `.artisys/release.json`; não existe uma segunda implementação da lógica de release dentro do CircleCI.

### Motivo do modo opt-in

O histórico mostra que `release_validator_linux` passou no commit `dbe3a25`, mas depois passou a falhar junto com `qa` e `module_contracts` em commits que não alteraram o módulo nem a configuração CircleCI. Em seguida, todos os jobs passaram a falhar juntos. Esse padrão é compatível com indisponibilidade de execução da conta/plano/runner, e não com regressão do `artisys-release`.

Sem acesso autenticado ao failure report da conta CircleCI, a mensagem exata do bloqueio não pode ser afirmada. A documentação oficial do CircleCI informa que, no Free Plan, jobs deixam de executar quando os créditos se esgotam. Por isso o repositório não deve depender do CircleCI para continuar entregando software.

## Woodpecker

O workflow `.woodpecker/artisys-release.yaml` é direcionado a um agente `windows/amd64` com backend `local`. Isso permite que builds que dependem do Windows, Electron, Inno Setup ou outras ferramentas instaladas na máquina executem no próprio PC.

Configuração mínima do agente:

```powershell
$env:WOODPECKER_SERVER="SEU_SERVIDOR:9000"
$env:WOODPECKER_AGENT_SECRET="SEU_SEGREDO"
$env:WOODPECKER_BACKEND="local"
woodpecker-agent
```

O agente local executa comandos diretamente na máquina e não oferece isolamento. Use apenas em ambiente confiável, com repositórios e usuários controlados. Não habilite execução automática de pull requests não confiáveis/forks nesse agente.

Para ativar um repositório, ele deve ser adicionado na interface do Woodpecker; o serviço cria o webhook no GitHub e passa a receber eventos de push/manual.

Referências oficiais consultadas em 2026-09-16:

- https://woodpecker-ci.org/docs/usage/workflow-syntax
- https://woodpecker-ci.org/docs/administration/configuration/agent
- https://woodpecker-ci.org/docs/next/administration/installation/supported-platforms
- https://circleci.com/docs/guides/orchestrate/pipeline-variables/
- https://circleci.com/docs/guides/plans-pricing/credits/

## Artefatos e evidências

O CLI grava um relatório JSON. Prints, vídeos, instaladores e outros artefatos continuam sendo produzidos pelos comandos do consumidor (`installer`/`evidence`/`publish`), podendo apontar diretamente para uma pasta do Google Drive sincronizada no Windows.

## Regra de integração de produtos

Cada produto precisa somente de `.artisys/release.json`. Nunca copiar a lógica do motor para o produto. O produto declara **o que executar**; o módulo decide **a ordem, bloqueios e relatório**.
