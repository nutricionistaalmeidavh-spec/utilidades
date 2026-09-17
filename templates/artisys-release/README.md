# Template ArtiSys Release

Copie `release.config.json` para `.artisys/release.json` do produto e substitua somente os comandos que realmente existem naquele sistema.

## Consumo recomendado

Para não duplicar o motor, mantenha o RepoUteis disponível uma única vez no computador e execute o wrapper dele apontando para a configuração do produto:

```powershell
C:\caminho\utilidades\scripts\artisys-release.ps1 -Config C:\caminho\PDVNexus\.artisys\release.json -Profile release
```

Para CI de um repositório consumidor, uma opção limpa é disponibilizar `utilidades` como submodule privado em `.artisys/utilidades` e usar os templates `artisys-release-manual.yml` ou `woodpecker-windows.yaml`.

## Recomendação mínima para desktop

- `test` obrigatório;
- `build` obrigatório;
- `installer` obrigatório;
- `qa` obrigatório e sempre posterior ao instalador;
- `security` recomendado;
- `evidence`, `deploy` e `publish` conforme o produto.

Exemplo com submodule:

```powershell
git submodule add git@github.com:nutricionistaalmeidavh-spec/utilidades.git .artisys/utilidades
node .artisys/utilidades/modules/artisys-release/bin/artisys-release.mjs .artisys/release.json --profile release
```

O produto declara seus comandos; a ordem, bloqueio e relatório continuam centralizados no `artisys-release`.
