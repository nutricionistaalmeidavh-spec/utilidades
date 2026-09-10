# @artisys/qa

Módulo compartilhado ArtiSys para QA visual e técnico com Playwright. A versão 1.0 executa fluxos declarativos em aplicações web ou Electron e produz evidências padronizadas: screenshots, vídeo, trace, erros de console/rede e resumo JSON. O consumidor mantém apenas URL/entrypoint, credenciais em secrets, seletores e regras específicas do produto.

## Resultado de uma execução

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

## Uso mais simples em qualquer repositório

Copie `templates/consumer` para `qa/` e ajuste `qa/artisys-qa.config.json`.

```json
{
  "schemaVersion": 1,
  "systemId": "meu-sistema",
  "mode": "web",
  "defaultEnvironment": "production",
  "defaultFlow": "smoke",
  "defaultViewport": "desktop",
  "capture": {"video": true, "screenshotEachStep": true},
  "environments": {
    "production": {"baseURL": "https://app.exemplo.com"}
  },
  "flows": {"smoke": "flows/smoke.json"}
}
```

Fluxo declarativo:

```json
{
  "name": "login",
  "steps": [
    {"action": "fill", "label": "E-mail", "valueFromEnv": "QA_USERNAME"},
    {"action": "fill", "label": "Senha", "valueFromEnv": "QA_PASSWORD"},
    {"action": "click", "role": "button", "name": "Entrar"},
    {"action": "expectVisible", "text": "Dashboard"},
    {"action": "screenshot", "name": "dashboard"}
  ]
}
```

Ações disponíveis na v1: `goto`, `click`, `fill`, `press`, `check`, `uncheck`, `hover`, `selectOption`, `reload`, `waitFor`, `waitForTimeout`, `expectVisible`, `expectText`, `expectURL` e `screenshot`. Seletores podem usar `selector`, `testId`, `role`+`name`, `text` ou `label`. Valores sensíveis devem usar `valueFromEnv`.

## Execução local

```sh
cd modules/artisys-qa
npm ci
npx playwright install chromium
node src/cli.mjs validate --config ../../../meu-repo/qa/artisys-qa.config.json
node src/cli.mjs run --config ../../../meu-repo/qa/artisys-qa.config.json --flow smoke --viewport desktop
```

Comandos: `validate`, `list` e `run`.

## GitHub Actions — execução pelo celular

O repositório `utilidades` fornece dois pontos de consumo:

- ação composta: `nutricionistaalmeidavh-spec/utilidades/.github/actions/artisys-qa@main`;
- workflow reutilizável: `.github/workflows/artisys-qa-reusable.yml`.

No consumidor, um workflow mínimo pode receber `flow`, `environment` e `viewport` via `workflow_dispatch`, chamar o workflow reutilizável e publicar `qa-artifacts` como artifact. Assim o computador local não precisa estar ligado para aplicações web acessíveis ou aplicações Electron que possam ser iniciadas pelo runner.

Como `utilidades` é privado, o GitHub deve permitir que os outros repositórios privados do mesmo proprietário usem suas Actions/workflows. Se a política da conta não permitir o compartilhamento direto, use um token de leitura somente para `utilidades` ou sincronize o módulo como snapshot controlado; nunca coloque tokens no código.

## Electron

```json
{
  "schemaVersion": 1,
  "systemId": "desktop-app",
  "mode": "electron",
  "electron": {
    "entry": "../desktop/main.cjs",
    "executablePath": "../node_modules/electron/dist/electron"
  },
  "environments": {"ci": {}},
  "flows": {"smoke": "flows/smoke.json"}
}
```

O runner abre a primeira janela Electron com Playwright. Screenshots e trace são capturados diretamente. Para vídeo Electron, o módulo amostra frames e monta MP4 com `ffmpeg`, porque o vídeo nativo do Playwright é destinado ao `BrowserContext` criado pelo browser. A Action instala `ffmpeg` e `xvfb` no runner Ubuntu.

## Processos locais opcionais

Ambientes web locais podem declarar:

```json
{
  "baseURL": "http://127.0.0.1:3000",
  "startCommand": "npm run start:test",
  "readyUrl": "http://127.0.0.1:3000/health"
}
```

O processo é iniciado antes do navegador, aguarda readiness e é encerrado ao fim. Logs vão para `process.log`.

## Multi-viewport

Padrões incorporados:

- `desktop`: 1440×900
- `tablet`: 1024×768
- `mobile`: 390×844

O mesmo fluxo pode ser executado em qualquer viewport sem duplicação de código.

## QA técnico existente

Este módulo não substitui `node:test`, testes unitários, integração, concorrência, banco ou release gates do produto. Ele adiciona a camada de navegação/captura visual. O PDV ArtiSys mantém seus testes técnicos e consome este módulo para evidência visual.

## Segurança e retenção

Screenshots, vídeo, trace e network metadata podem conter dados sensíveis. Use contas/dados sintéticos e retenção curta dos artifacts. Credenciais devem ficar em GitHub Secrets e entrar no fluxo apenas por `valueFromEnv`. Nunca grave secrets em manifesto, fluxo ou logs.

## Desenvolvimento do módulo

```sh
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:example
```

O projeto de referência POS em `examples/pos-reference` continua sendo apenas uma demonstração em memória e não valida nenhum consumidor real.

## Política de custo

O módulo não exige serviço pago. Playwright é usado como ferramenta de desenvolvimento e o GitHub Actions pode ser utilizado dentro da franquia disponível da conta. Custos externos só aparecem se o consumidor escolher infraestrutura/serviços adicionais.
