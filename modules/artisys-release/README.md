# ArtiSys Release

Motor reutilizável de build, validação, release e deploy. Estado: **implemented 0.1.0**.

A regra central é: **o pipeline pertence ao produto; o provedor de CI apenas chama o mesmo motor**. Assim, terminal, `act`, CircleCI, GitHub Actions e Woodpecker não precisam manter cópias diferentes da lógica de release.

## Perfis

- `quick`: `deps → lint → test → build`
- `full`: `deps → lint → test → build → installer → qa → security`
- `release`: `deps → lint → test → build → installer → qa → security → evidence → deploy → publish`

O instalador vem antes de QA por design, para que o QA possa validar o artefato que será entregue.

## Configuração

```json
{
  "product": "PDVNexus",
  "version": "1.3.2",
  "profile": "release",
  "requiredSteps": ["test", "build", "installer", "qa"],
  "steps": {
    "deps": "npm ci",
    "lint": "npm run lint",
    "test": "npm test",
    "build": "npm run build",
    "installer": "npm run dist",
    "qa": "npm run qa:e2e",
    "security": "npm run security",
    "evidence": "npm run qa:evidence",
    "deploy": "npm run deploy",
    "publish": "npm run publish"
  }
}
```

Etapas ausentes são puladas, exceto quando listadas em `requiredSteps`; nesse caso o pipeline bloqueia.

## CLI

```bash
artisys-release .artisys/release.json --profile release
artisys-release .artisys/release.json --profile full --dry-run
```

O resultado é fail-fast e um relatório JSON é gravado em `artifacts/artisys-release-report.json` por padrão.

## Verificação

```bash
npm test
npm run check
npm run example
npm run dry-run
npm pack --dry-run
```

Nenhum serviço pago ou infraestrutura permanente é obrigatório.
