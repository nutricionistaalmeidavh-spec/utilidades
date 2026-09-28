# Consumir ArtiSys QA

1. Copie esta pasta como `qa/` no sistema consumidor.
2. Ajuste `qa/artisys-qa.config.json` com `systemId`, `mode`, ambientes e fluxos.
3. Para conta demo reutilizável, adapte `demo-adapter.mjs` e use `artisys-qa.demo-profile.example.json` como referência.
4. Configure usuário/senha somente em variáveis de ambiente ou GitHub Secrets (`ARTISYS_DEMO_USERNAME`, `ARTISYS_DEMO_PASSWORD` no exemplo).
5. Copie o workflow para `.github/workflows/qa-capture.yml` e execute via Actions.

A infraestrutura central cuida de lifecycle, fixtures, flows compostos, captura e redaction. O consumidor implementa apenas o adapter que traduz conta/workspace/fixtures/capabilities para o produto real.

Estratégias de workspace: `persistent` para backend que permanece entre gravações, `snapshot` para Electron/local e `ephemeral` para execução descartável.

Comandos úteis:

```sh
artisys-qa demo-profile prepare --config qa/artisys-qa.config.json --profile default
artisys-qa demo-profile status --config qa/artisys-qa.config.json --profile default
artisys-qa demo --config qa/artisys-qa.config.json --demo quick-30s --profile default --preset reels-9x16
```

Para web publicado, use `mode: web` + `baseURL`. Para web local no runner, use `startCommand`, `readyUrl` e `baseURL`. Para Electron, use `mode: electron` e `electron.entry`.

Atualizações do módulo central são adotadas explicitamente pelo consumidor por versão/commit pinado; desktop exige novo build/instalador e web exige redeploy quando o runtime/config do produto mudar.
