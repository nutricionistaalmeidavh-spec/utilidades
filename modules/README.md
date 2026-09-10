# Módulos ArtiSys reutilizáveis

Esta pasta contém integrações próprias construídas sobre os upstreams aprovados em `projects/`.

`artisys-qa` está estável em **1.1.0**. Security, API Contracts e Documents estão implementados em 0.2.0. AI Quality, Privacy e BIM permanecem em `foundation`.

## Regra principal

Nenhum módulo pode exigir servidor, daemon, banco dedicado, VPS, PC ligado ou runner self-hosted permanente.

Os únicos modos operacionais aceitos são:

| Classe | Uso |
|---|---|
| `embedded` | biblioteca executada dentro do próprio produto |
| `ci` | GitHub Actions/CI |
| `local-on-demand` | processo local iniciado apenas durante a tarefa e encerrado depois |
| `dev-tool` | desenvolvimento; não participa do runtime do cliente |

Para reutilização entre produtos, `consumptionMode` deve ser `shared` ou `snapshot`. Módulos baseados em serviço always-on não são aceitos neste repositório.

## Estrutura mínima

```text
modules/<id>/
├─ module.json
└─ README.md
```

## Regra de integração

O consumidor usa o contrato ArtiSys. Não copie `projects/<upstream>` para dentro do produto e não espalhe imports específicos do upstream pelo domínio.

## Módulos atuais

1. `artisys-qa` — stable 1.1.0 — Playwright/Chromium
2. `artisys-security` — implemented 0.2.0 — Gitleaks + Trivy + Semgrep
3. `artisys-documents` — implemented 0.2.0 — PaddleOCR + OpenCV
4. `artisys-api-contracts` — implemented 0.2.0 — OpenAPI Generator + Pact JS
5. `artisys-ai-quality` — foundation — Promptfoo
6. `artisys-privacy` — foundation — Presidio local/CI
7. `artisys-bim` — foundation — IfcOpenShell local sob demanda

Consulte `../docs/MODULE_KITS.md` e `../docs/INTEGRATION_GUIDE.md`.
