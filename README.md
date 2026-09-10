# utilidades

Repositório central de projetos open source aprovados e módulos ArtiSys reutilizáveis para os sistemas ArtiSys/MH.

O repositório possui duas camadas deliberadamente separadas:

- `projects/`: upstreams externos intactos, versionados como Git submodules e fixados em commit exato.
- `modules/`: kits de integração ArtiSys, com contratos, adapters, configuração e política de consumo para os sistemas consumidores.

## Estado atual

- **48 projetos incorporados** como Git submodules.
- **9 módulos ArtiSys prioritários** registrados em `catalog/modules.json`.
- Cada upstream está fixado em um commit exato.
- `catalog/projects.json` é a fonte de verdade para origem, branch, SHA, licença e política de consumo dos upstreams.
- `catalog/modules.json` é a fonte de verdade para os módulos reutilizáveis ArtiSys.
- Projetos com copyleft, licença mista ou exigência especial permanecem isolados por adapter, CLI ou serviço.

## Módulos ArtiSys prioritários

- `artisys-qa` — Playwright e automação de testes E2E/Chromium.
- `artisys-security` — Gitleaks, Trivy e Semgrep em pipeline reutilizável.
- `artisys-documents` — PaddleOCR + OpenCV para documentos, scanner e classificação.
- `artisys-authz` — autorização fina via OpenFGA.
- `artisys-optimizer` — otimização de escalas e recursos via Timefold Solver.
- `artisys-api-contracts` — OpenAPI Generator + Pact JS.
- `artisys-ai-quality` — testes e regressão de IA via Promptfoo.
- `artisys-privacy` — detecção/anonimização de PII via Presidio.
- `artisys-bim` — fronteira BIM baseada em IfcOpenShell.

## Regra de consumo

1. `projects/` nunca recebe regra de negócio ArtiSys.
2. `modules/` pode conter código e configuração ArtiSys, mas não deve alterar o upstream.
3. Cada módulo declara `consumptionMode`: `shared`, `snapshot` ou `service`.
4. `shared`: manter sincronizado com a versão central sempre que possível.
5. `snapshot`: copiar uma versão para o consumidor e permitir customização local consciente.
6. `service`: não copiar o upstream; consumir o serviço por fronteira estável.
7. Credenciais e secrets pertencem ao ambiente do consumidor, nunca a `utilidades`.
8. AGPL/GPL, LGPL, MPL, BSL e licenças próprias seguem as restrições em `docs/LICENSES.md`.

## Clonar com as utilidades

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Veja `modules/README.md`, `docs/INTEGRATION_GUIDE.md` e `docs/LICENSES.md` antes de conectar uma utilidade a outro projeto.
