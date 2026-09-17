# Template ArtiSys Release

Copie `release.config.json` para `.artisys/release.json` do produto e substitua somente os comandos que realmente existem naquele sistema.

Recomendação mínima para desktop:

- `test` obrigatório;
- `build` obrigatório;
- `installer` obrigatório;
- `qa` obrigatório e sempre posterior ao instalador;
- `security` recomendado;
- `evidence`, `deploy` e `publish` conforme o produto.

Com o módulo `artisys-release` disponível, execute:

```powershell
node modules/artisys-release/bin/artisys-release.mjs .artisys/release.json --profile release
```

Ou use `scripts/artisys-release.ps1` no próprio RepoUteis como wrapper local.
