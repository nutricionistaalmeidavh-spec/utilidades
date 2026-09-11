# @artisys/qa

Módulo compartilhado ArtiSys para QA, automação e gravação de demonstrações em aplicações web ou Electron.

A versão **1.4.0** adiciona o **QA Remote Control** opcional: um painel web mobile-first, self-hosted, que dispara o mesmo runner local sem depender do GitHub Actions. O Actions continua disponível e independente. O Remote Control só existe enquanto o comando `remote` estiver explicitamente em execução.

A plataforma de **Demo Profiles** prepara/reutiliza conta demo, workspace isolado, fixtures versionadas e fluxos compartilhados antes de executar Playwright. Regras específicas de cada produto ficam atrás de um adapter pequeno do consumidor.

## O que o módulo centraliza

- Playwright web e Electron;
- QA flows e Demo Flows declarativos;
- conta demo idempotente (`find` → `create if missing` → `authenticate`);
- workspaces `persistent`, `snapshot` ou `ephemeral`;
- fixtures genéricas e packs específicos do produto;
- biblioteca de fluxos reutilizáveis via `uses`;
- ações abstratas via `capability` mapeadas pelo adapter;
- screenshots, trace, telemetria e vídeo;
- regressão visual opt-in;
- QA Remote Control opt-in para celular/rede local;
- MP4 social 16:9, 1:1 e Reels 9:16;
- redaction de secrets nos summaries, telemetria e logs de processo.

## Demo Profile

Exemplo de configuração:

```json
{
  "defaultDemoProfile": "default",
  "demoProfiles": {
    "default": {
      "adapter": "./demo-adapter.mjs",
      "account": {
        "createIfMissing": true,
        "usernameEnv": "ARTISYS_DEMO_USERNAME",
        "passwordEnv": "ARTISYS_DEMO_PASSWORD"
      },
      "workspace": {
        "strategy": "persistent",
        "resetBeforeRun": "baseline"
      },
      "fixtures": ["common/base", "common/customer"]
    }
  }
}
```

Credenciais nunca ficam no JSON: os campos `*Env` apontam para variáveis de ambiente/GitHub Secrets.

### Ciclo da conta

Em cada execução com profile:

```text
resolve profile
  → findDemoAccount
  → createDemoAccount (somente se ausente)
  → authenticateDemoAccount
  → ensureDemoWorkspace
  → resetDemoWorkspace (opcional e somente se workspace.demo === true)
  → seedDemoFixtures
  → executar flow
```

A conta pode permanecer no backend do sistema entre gravações. O adapter deve implementar `findDemoAccount` de forma determinística para a mesma identidade ser reutilizada.

### Estratégias de workspace

| Estratégia | Uso |
|---|---|
| `persistent` | Web/staging ou backend persistente. Conta e workspace continuam disponíveis entre execuções. |
| `snapshot` | Electron/local. O adapter pode restaurar/exportar um snapshot de dados demo. |
| `ephemeral` | Workspace descartável por execução. |

Reset destrutivo é bloqueado se o adapter não devolver o workspace com `demo: true`.

## Adapter do produto

O módulo central não conhece tabelas, endpoints nem seletores do PDV/Obra/etc. O consumidor implementa somente o necessário:

```js
export default {
  async findDemoAccount(context) {},
  async createDemoAccount(context) {},
  async authenticateDemoAccount(context) {},
  async ensureDemoWorkspace(context) {},
  async resetDemoWorkspace(context, policy) {},
  async seedDemoFixtures(context, packs) {},
  capabilities: {
    'auth.login': async ({ page, runtimeContext }) => {}
  }
};
```

Veja `templates/consumer/demo-adapter.mjs` e `templates/consumer/artisys-qa.demo-profile.example.json`.

## Fixtures reutilizáveis

Packs centrais iniciais:

- `common/base`
- `common/customer`
- `common/employee`
- `commerce/catalog`
- `commerce/order`

Cada pack possui `id` e `revision`. O adapter materializa esses dados no schema real do produto usando upsert/chaves determinísticas. Packs específicos, por exemplo `pdv/salon` ou `obra/project`, ficam no consumidor usando o mesmo contrato.

## Flows reutilizáveis

Um flow pode incluir outro:

```json
{
  "steps": [
    { "uses": "common/login" },
    { "action": "capability", "name": "navigation.dashboard" },
    { "action": "screenshot", "name": "dashboard" }
  ]
}
```

Biblioteca central inicial:

- `common/login`
- `common/logout`
- `common/dashboard-tour`
- `common/create-record`
- `common/search-record`
- `common/report-tour`

`uses` também aceita arquivos JSON relativos. Inclusões recursivas são rejeitadas.

Ações específicas continuam disponíveis normalmente: `goto`, `click`, `fill`, `press`, `check`, `uncheck`, `hover`, `selectOption`, `reload`, `waitFor`, `waitForTimeout`, `expectVisible`, `expectText`, `expectURL`, `screenshot` e `capability`.

## CLI

```sh
artisys-qa validate --config qa/artisys-qa.config.json
artisys-qa list --config qa/artisys-qa.config.json

artisys-qa demo-profile status --config qa/artisys-qa.config.json --profile default
artisys-qa demo-profile prepare --config qa/artisys-qa.config.json --profile default
artisys-qa demo-profile reset --config qa/artisys-qa.config.json --profile default

artisys-qa run --config qa/artisys-qa.config.json --flow smoke --profile default
artisys-qa demo --config qa/artisys-qa.config.json --demo quick-30s --profile default --preset reels-9x16
```

Quando existe `defaultDemoProfile`, `run` e `demo` o utilizam automaticamente. Configurações antigas sem profile continuam funcionando sem alteração.

## QA Remote Control — opcional

O Remote Control não substitui o GitHub Actions e não inicia sozinho. Para controle apenas no próprio PC:

```sh
artisys-qa remote --config qa/artisys-qa.config.json
```

Para abrir o painel no celular conectado à mesma rede local/Wi-Fi:

```sh
artisys-qa remote --config qa/artisys-qa.config.json --host 0.0.0.0 --port 4173
```

A CLI imprime um endereço `LAN: http://<ip-do-pc>:4173` e um `TOKEN=<token-aleatorio>`. Abra o endereço no celular e informe esse token. Também é possível definir o token previamente por `--token` ou `ARTISYS_QA_REMOTE_TOKEN`.

No painel é possível escolher somente valores já declarados no manifest:

- flow;
- environment;
- viewport desktop/tablet/mobile;
- regressão visual opt-in.

O navegador **não envia comandos de shell arbitrários** ao PC. O servidor aceita uma execução por vez e reutiliza `runQaFlow`, o mesmo núcleo usado pela CLI. Atualização de baseline visual não é exposta pelo painel remoto.

O computador/runner precisa estar ligado durante a execução. O modo LAN é voltado a rede confiável. Para acesso pela internet, use separadamente uma VPN/reverse proxy seguro self-hosted; isso não é dependência do núcleo. Se preferir, continue disparando o QA pelo GitHub Actions.

## Resultado QA

```text
qa-artifacts/<sistema>-<fluxo>-<viewport>-<timestamp>/
├── screenshots/
├── video.webm              # web
├── video.mp4               # Electron
├── trace.zip
├── telemetry.json
├── run-summary.json
└── process.log             # quando houver startCommand
```

`run-summary.json` inclui somente metadados seguros do Demo Profile (nome, estratégia, ids não sensíveis e revisões de fixtures).

## Demo Flows e vídeo social

| Preset | Saída |
|---|---|
| `landscape-16x9` | 1920×1080 MP4 |
| `square-1x1` | 1080×1080 MP4 |
| `reels-9x16` | 1080×1920 MP4 |

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

`holdMs` controla o ritmo de uma etapa. O vídeo final é normalizado por ffmpeg/ffprobe para o preset e duração solicitados.

Em Electron, a viewport desktop é preservada e encaixada no canvas social. Em web responsiva, o preset também pode dirigir a viewport de captura.

## Segurança

- nunca coloque senha/token literal no manifest;
- use `usernameEnv`, `passwordEnv`, `tokenEnv` etc.;
- o runner aplica redaction dos valores sensíveis em summaries, telemetria e `process.log`;
- traces/screenshots/vídeos ainda podem registrar conteúdo visível da aplicação: use exclusivamente dados demo/sintéticos;
- adapters devem isolar a conta/workspace demo de dados reais;
- reset exige `workspace.demo === true`;
- o Remote Control exige token para a API e não recebe shell arbitrário;
- não exponha diretamente a porta do Remote Control à internet sem uma camada segura própria.

## GitHub Actions

O repositório fornece action composta e workflow reutilizável. O consumidor pode disparar QA/Demo pelo GitHub, inclusive pelo celular, e receber `qa-artifacts`.

O Remote Control é uma alternativa opt-in para executar no runner local/self-hosted quando você não quiser usar Actions. Nenhum dos dois depende do outro.

Para repositórios que não podem consumir diretamente um workflow privado compartilhado, use runtime pinado no consumidor e registre versão/commit de origem. Atualizações centrais não devem entrar silenciosamente em aplicativos já publicados: o consumidor atualiza o pin e gera um novo build/redeploy.

## Compatibilidade

- Node.js `>=22`
- Playwright `>=1.51 <2`
- Electron fornecido pelo consumidor
- ffmpeg para MP4/demo Electron
- ffprobe para normalização de duração

## Desenvolvimento

```sh
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:example
npm pack --dry-run
```

## Custo

O núcleo não exige serviço pago. Playwright, o QA Remote Control e ffmpeg rodam localmente ou no runner escolhido pelo consumidor.
