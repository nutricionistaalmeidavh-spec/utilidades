# @artisys/qa

Módulo compartilhado ArtiSys para QA visual/técnico e gravação de demonstrações com Playwright. A versão 1.1 executa fluxos declarativos em aplicações web ou Electron, gera screenshots, vídeo, trace, telemetria e também Demo Flows reutilizáveis para 16:9, 1:1 e Reels/TikTok/Shorts 9:16.

O consumidor mantém apenas URL/entrypoint, credenciais em secrets, seletores e regras específicas do produto.

## Resultado de uma execução QA

```text
qa-artifacts/<sistema>-<fluxo>-<viewport>-<timestamp>/
├── screenshots/
├── video.webm              # web
├── video.mp4               # Electron, via frames + ffmpeg
├── trace.zip
├── telemetry.json
├── run-summary.json
└── process.log             # quando houver startCommand
```

## Demo Flows

Demo Flows são separados dos testes. O objetivo é mostrar o produto, não validar regras de negócio.

Presets incorporados:

| Preset | Saída |
|---|---|
| `landscape-16x9` | 1920×1080 MP4 |
| `square-1x1` | 1080×1080 MP4 |
| `reels-9x16` | 1080×1920 MP4 |

Exemplo no manifesto:

```json
{
  "demos": {
    "quick-30s": {
      "file": "demo/quick-30s.json",
      "preset": "reels-9x16",
      "durationTargetSec": 30
    }
  }
}
```

Fluxo de demonstração:

```json
{
  "name": "quick-30s",
  "durationTargetSec": 30,
  "steps": [
    {"action": "waitFor", "selector": "body", "holdMs": 2500},
    {"action": "click", "selector": "[data-route='products']", "holdMs": 4000},
    {"action": "click", "selector": "[data-route='checkout']", "holdMs": 4000}
  ]
}
```

`holdMs` controla o ritmo depois de qualquer etapa. A duração-alvo é informativa: o `demo-summary.json` registra duração real e desvio, mas não reprova o fluxo por alguns segundos de diferença.

Em Electron, o sistema continua em uma viewport desktop legível; o ffmpeg preserva a proporção e centraliza o conteúdo no canvas vertical, evitando espremer a interface. Para web responsiva, o preset pode ser usado como viewport de captura.

Execução:

```sh
node src/cli.mjs demo \
  --config ../../../meu-repo/qa/artisys-qa.config.json \
  --demo quick-30s \
  --preset reels-9x16
```

Resultado adicional:

```text
├── demo-video.mp4
└── demo-summary.json
```

## Uso mais simples em qualquer repositório

Copie `templates/consumer` para `qa/` e ajuste `qa/artisys-qa.config.json`. O template já inclui um `quick-30s` de demonstração.

```json
{
  "schemaVersion": 1,
  "systemId": "meu-sistema",
  "mode": "web",
  "defaultEnvironment": "production",
  "defaultFlow": "smoke",
  "defaultDemo": "quick-30s",
  "defaultViewport": "desktop",
  "capture": {"video": true, "screenshotEachStep": true},
  "environments": {
    "production": {"baseURL": "https://app.exemplo.com"}
  },
  "flows": {"smoke": "flows/smoke.json"},
  "demos": {
    "quick-30s": {"file": "demo/quick-30s.json", "preset": "reels-9x16", "durationTargetSec": 30}
  }
}
```

Ações disponíveis: `goto`, `click`, `fill`, `press`, `check`, `uncheck`, `hover`, `selectOption`, `reload`, `waitFor`, `waitForTimeout`, `expectVisible`, `expectText`, `expectURL` e `screenshot`. Seletores podem usar `selector`, `testId`, `role`+`name`, `text` ou `label`. Valores sensíveis devem usar `valueFromEnv`.

## Execução local

```sh
cd modules/artisys-qa
npm ci
npx playwright install chromium
node src/cli.mjs validate --config ../../../meu-repo/qa/artisys-qa.config.json
node src/cli.mjs run --config ../../../meu-repo/qa/artisys-qa.config.json --flow smoke --viewport desktop
node src/cli.mjs demo --config ../../../meu-repo/qa/artisys-qa.config.json --demo quick-30s --preset reels-9x16
```

Comandos: `validate`, `list`, `run` e `demo`.

## GitHub Actions — execução pelo celular

O repositório `utilidades` fornece ação composta e workflow reutilizável. O consumidor pode receber `flow`/`demo`, `environment`, `viewport`/`preset` via `workflow_dispatch` e publicar `qa-artifacts` como artifact. Assim o computador local não precisa estar ligado para aplicações web acessíveis ou Electron inicializável pelo runner.

Como `utilidades` é privado, o GitHub deve permitir que outros repositórios privados usem suas Actions/workflows. Quando a política não permitir compartilhamento direto, use o runtime fixado no consumidor, mantendo a origem/commit central documentados.

## Electron

O runner abre a primeira janela Electron com Playwright. Screenshots e trace são capturados diretamente. Vídeo Electron é criado por frames e `ffmpeg`. Demo Flows normalizam esse vídeo para o preset social solicitado.

## Multi-viewport QA

- `desktop`: 1440×900
- `tablet`: 1024×768
- `mobile`: 390×844

## QA técnico existente

O módulo não substitui `node:test`, integração, concorrência, banco ou release gates do produto. Demo Flows também não substituem QA: são uma camada separada para apresentação do sistema.

## Segurança e retenção

Use dados sintéticos. Screenshots, vídeo, trace e telemetria podem conter dados sensíveis. Credenciais devem ficar em GitHub Secrets e entrar apenas por `valueFromEnv`.

## Desenvolvimento

```sh
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:example
```

## Política de custo

O módulo não exige serviço pago. Playwright e ffmpeg são usados localmente/no runner; custos dependem apenas da infraestrutura/Actions escolhida pelo consumidor.
