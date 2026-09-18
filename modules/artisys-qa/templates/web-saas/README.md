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

## P1 — hardening

Para produtos comerciais, o próximo nível após o smoke P0 deve executar:

- matriz `desktop/tablet/mobile`;
- fluxos negativos de autorização/licença;
- URLs inválidas e dados hostis/XSS;
- PWA/manifest/service worker quando aplicável;
- isolamento multitenant;
- gates nativos antes do profile `release`.

Use `@artisys/qa/matrix` para construir a matriz e mantenha a lógica específica no consumidor.

## P2 — bundle de release

Consumidores web/SaaS devem gerar um bundle padronizado com `QA-SUMMARY.json/txt`, HTML, cobertura, endpoints e erros. O release final usa `evaluateProductGate` e deve falhar fechado quando houver check crítico, HTTP 5xx, request failure, console error acima da política ou lacuna crítica de cobertura. Para novos SaaS, use também os packs `saas`, `licensing` e `multitenancy` quando os flows correspondentes existirem.
