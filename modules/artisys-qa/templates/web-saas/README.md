# Template Web SaaS — ArtiSys QA

Template mínimo para sistemas web/SaaS que consomem `@artisys/qa`.

## Convenção

- `mode: web`;
- profiles `quick`, `full` e `release`;
- `quick` deve permanecer read-only;
- `full` pode executar flows de negócio em ambiente descartável;
- `release` deve incluir todos os gates críticos do produto consumidor;
- screenshots, vídeo, trace e telemetria ficam em `qa-artifacts/`;
- credenciais e secrets devem vir exclusivamente de variáveis de ambiente.

## Uso

1. Copie esta pasta para `qa/` no consumidor.
2. Troque `systemId`, URLs e flows.
3. Configure `startCommand`/`readyUrl` no ambiente local apenas quando o próprio QA puder iniciar o servidor.
4. Nunca coloque senha, cookie, token ou secret no JSON.
5. Mantenha os testes nativos do produto no `qa:release`; o `@artisys/qa` complementa, não substitui, esses gates.

Exemplo:

```sh
artisys-qa quick --config qa/artisys-qa.config.json --environment local --output qa-artifacts
artisys-qa full --config qa/artisys-qa.config.json --environment local --output qa-artifacts
artisys-qa release --config qa/artisys-qa.config.json --environment local --output qa-artifacts
```
