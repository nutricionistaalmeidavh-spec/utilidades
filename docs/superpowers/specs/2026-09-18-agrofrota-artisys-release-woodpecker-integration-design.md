# AgroFrota — ArtiSys Release + Woodpecker

## Objetivo
Padronizar `SistemaLavoura`, `pecuaria`, `maquinasagricolas` e `frota-e-manutencao` para usar o motor compartilhado `artisys-release` e o `artisys-ci-reporter` de `utilidades`, removendo a lógica provisória duplicada dos workflows atuais.

## Fonte canônica
O motor permanece somente em `utilidades/modules/artisys-release` e `utilidades/modules/artisys-ci-reporter`. Os produtos não copiam esses módulos.

Pin inicial de `utilidades`: `a444031860d5b8c91adc5628759bc67c0c29d557`.

A integração é aplicada sobre `migration/standalone-phase-0-8`; `main` e o monorepo legado não são alterados.

## Estrutura em cada produto

```text
.artisys/release.json
.artisys/utilidades.lock
.woodpecker/artisys-release.yaml
scripts/artisys-release.ps1
```

O antigo `.woodpecker/verify.yml` será removido após o novo workflow existir.

## Repetibilidade
`ARTISYS_UTILIDADES_PATH` aponta para o checkout compartilhado de `utilidades` no Windows. O wrapper lê `.artisys/utilidades.lock`, confirma que o SHA pinado existe e cria um `git worktree --detach` temporário exatamente nesse commit. O checkout compartilhado não é alterado. Se o SHA não existir localmente, o pipeline falha; nunca cai silenciosamente para `main`.

## Pipeline
A ordem continua pertencendo ao `artisys-release`:

`deps → test → build → installer → qa → security → evidence`

O produto apenas declara comandos em `.artisys/release.json`. Mínimo esperado:

- deps: `npm install --no-audit --no-fund`
- test: `npm run check`
- build: `npm run build:web`
- installer: `npm run build:win`
- qa: `npm run phase5`
- evidence: validação das evidências do produto

O instalador permanece anterior ao QA. Fase 7 continua exigindo banco legado real e não pode ser simulada por CI comum.

## Woodpecker
O workflow usa agente `windows/amd64`, backend `local`, em eventos `push` e `manual`. Pull requests não confiáveis não executam automaticamente. O YAML chama o wrapper do produto; não contém uma segunda implementação de build/test/QA.

## Feedback
Após a execução, `artisys-ci-reporter` publica no GitHub status de sucesso ou falha, produto, branch, commit, pipeline, step, exit code, diagnóstico e presença do instalador. Segredos e credenciais ficam somente no host do agente e nunca no repositório.

## Fases 5–8
Woodpecker automatiza repetibilidade e feedback, mas não substitui os gates standalone. F5 segue como robustez funcional; F7 segue como ensaio não destrutivo com banco legado real; F8 segue fail-closed e só certifica evidências do mesmo commit.

## Critérios de aceitação
Nos quatro produtos:
1. existe um único workflow Woodpecker de release;
2. o YAML não duplica lógica de produto;
3. `.artisys/release.json` declara os comandos reais;
4. `.artisys/utilidades.lock` pina `a444031860d5b8c91adc5628759bc67c0c29d557`;
5. o wrapper executa o motor em worktree temporário no SHA pinado;
6. sucesso e falha são reportados pelo `artisys-ci-reporter`;
7. nenhum segredo é versionado;
8. F7/F8 permanecem fail-closed;
9. `.woodpecker/verify.yml` é removido;
10. `main` e o monorepo permanecem intactos.

## Fora de escopo
Instalar o servidor/agent, ativar os quatro repositórios na UI do Woodpecker, armazenar credenciais, fazer merge para `main` ou remover o monorepo legado.