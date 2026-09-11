# @artisys/qa

Módulo compartilhado ArtiSys para QA, automação e gravação de demonstrações em aplicações web ou Electron.

A versão **2.0.0** consolida o módulo como produto reutilizável de QA: perfis `quick`, `full` e `release`, smoke de executável desktop, helpers de rede/concorrência, packs de negócio, relatório HTML/JSON com histórico local, gate de release fail-closed e Remote Control 2.0 com execução por perfil.

O **QA Remote Control** continua opcional, mobile-first e self-hosted. Ele dispara o mesmo runner local sem tornar GitHub Actions obrigatório. O Actions continua disponível e independente.

## O que o módulo centraliza

- Playwright web e Electron;
- QA flows e Demo Flows declarativos;
- perfis de execução `quick`, `full` e `release`;
- smoke de executável desktop;
- helpers de concorrência e recuperação de falhas transitórias de rede;
- packs reutilizáveis `auth`, `commerce`, `finance` e `workforce`;
- relatórios JSON/HTML e histórico local limitado;
- release gate que falha fechado em verificações críticas;
- conta demo idempotente (`find` → `create if missing` → `authenticate`);
- workspaces `persistent`, `snapshot` ou `ephemeral`;
- fixtures genéricas e packs específicos do produto;
- biblioteca de fluxos reutilizáveis via `uses`;
- ações abstratas via `capability` mapeadas pelo adapter;
- screenshots, trace, telemetria e vídeo;
- regressão visual opt-in;
- QA Remote Control opt-in para celular/rede local;
- redaction de secrets nos summaries, telemetria e logs de processo.

## Perfis de QA

Os três perfis usam o mesmo `runQaFlow` central e apenas orquestram os flows já declarados pelo consumidor.

```sh
artisys-qa quick --config qa/artisys-qa.config.json
artisys-qa full --config qa/artisys-qa.config.json
artisys-qa release --config qa/artisys-qa.config.json
```

Comportamento padrão:

| Perfil | Objetivo | Gate crítico |
|---|---|---|
| `quick` | smoke e poucos fluxos críticos durante desenvolvimento | não |
| `full` | todos os flows declarados, mais checks adicionais disponíveis | não |
| `release` | validação completa antes de publicação | sim |

O consumidor pode sobrescrever os flows de cada perfil:

```json
{
  "qaProfiles": {
    "quick": {
      "flows": ["smoke", "login", "sale"]
    },
    "full": {
      "flows": ["smoke", "login", "sale", "cancel-sale", "cash-close"]
    },
    "release": {
      "flows": ["smoke", "login", "sale", "cancel-sale", "cash-close"],
      "criticalFlows": ["smoke", "sale", "cancel-sale", "cash-close"]
    }
  }
}
```

O `release` bloqueia a saída quando uma verificação crítica falha. Override existe apenas de forma explícita e auditável:

```sh
artisys-qa release --config qa/artisys-qa.config.json \
  --override-release-gate \
  --override-reason "motivo documentado"
```

## Desktop / executável

Para consumidores que possuem um `.exe`, o perfil `full`/`release` pode executar smoke do processo quando o manifest declara:

```json
{
  "desktop": {
    "executable": "dist/MyApp.exe",
    "args": [],
    "startupGraceMs": 1500,
    "shutdownTimeoutMs": 5000
  }
}
```

O kit verifica abertura, saída prematura, captura stdout/stderr e encerramento. Regras específicas de instalador permanecem no consumidor/release-validator; o QA não hard-coda NSIS/MSI.

## Packs de negócio

O módulo expõe metadados reutilizáveis para mapear flows comuns:

- `auth`: `login`, `logout`, `permissions`, `session`;
- `commerce`: `sale`, `cancel-sale`, `cash-open`, `cash-close`, `customer`, `inventory`;
- `finance`: `income`, `expense`, `reconciliation`, `dre`;
- `workforce`: `employee`, `attendance`, `payment`, `receipt`.

O pack não inventa seletores nem regras do produto: ele apenas resolve os flows que o consumidor realmente declarou.

## Rede e concorrência

A API pública inclui:

- `withTerminals(...)` para múltiplos contextos Playwright isolados no mesmo servidor;
- `runConcurrent(...)` para executar ações simultâneas;
- `retryTransient(...)` para falhas transitórias como `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EAI_AGAIN`, `ENETDOWN` e `ENETUNREACH`.

Essas primitivas permitem que cada produto defina cenários como venda simultânea, alteração concorrente de estoque, queda e retorno de rede sem acoplar regras de negócio ao core.

## Relatórios e histórico

Cada execução por perfil gera:

```text
qa-artifacts/
├── history.json
├── reports/
│   └── <sistema>-<perfil>-<timestamp>/
│       ├── report.json
│       └── report.html
└── <execuções individuais>/
    ├── screenshots/
    ├── trace.zip
    ├── telemetry.json
    └── run-summary.json
```

O relatório agregado inclui total, aprovados, falhas, detalhes por flow/check e o estado do release gate. O histórico é local e limitado para não crescer indefinidamente.

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

### Estratégias de workspace

| Estratégia | Uso |
|---|---|
| `persistent` | Web/staging ou backend persistente. |
| `snapshot` | Electron/local. |
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

## CLI

```sh
artisys-qa validate --config qa/artisys-qa.config.json
artisys-qa list --config qa/artisys-qa.config.json

artisys-qa quick --config qa/artisys-qa.config.json
artisys-qa full --config qa/artisys-qa.config.json --visual
artisys-qa release --config qa/artisys-qa.config.json

artisys-qa run --config qa/artisys-qa.config.json --flow smoke --profile default
artisys-qa demo --config qa/artisys-qa.config.json --demo quick-30s --profile default --preset reels-9x16
```

Configurações antigas sem `qaProfiles` continuam funcionando.

## QA Remote Control — opcional

Para controle apenas no próprio PC:

```sh
artisys-qa remote --config qa/artisys-qa.config.json
```

Para abrir no celular conectado à mesma rede local/Wi-Fi:

```sh
artisys-qa remote --config qa/artisys-qa.config.json --host 0.0.0.0 --port 4173
```

A CLI imprime `LAN: http://<ip-do-pc>:4173` e `TOKEN=<token-aleatorio>`.

No painel 2.0 é possível escolher:

- execução por perfil `quick`, `full` ou `release`;
- ou flow individual;
- environment;
- viewport desktop/tablet/mobile;
- regressão visual opt-in;
- visualizar o estado da execução e histórico resumido local.

O navegador **não envia comandos de shell arbitrários** ao PC. O servidor aceita uma execução por vez. Atualização de baseline visual não é exposta pelo painel remoto.

O computador/runner precisa estar ligado durante a execução. O modo LAN é voltado a rede confiável. Para internet, use separadamente VPN/reverse proxy seguro self-hosted; isso não é dependência do núcleo.

## Segurança

- nunca coloque senha/token literal no manifest;
- use variáveis de ambiente;
- o runner aplica redaction dos valores sensíveis em summaries, telemetria e `process.log`;
- use dados demo/sintéticos em screenshots/traces/vídeos;
- reset exige `workspace.demo === true`;
- o Remote Control exige token para a API e não recebe shell arbitrário;
- não exponha diretamente a porta do Remote Control à internet sem camada segura própria.

## GitHub Actions

O repositório fornece action composta e workflow reutilizável. O consumidor pode continuar usando GitHub Actions normalmente. O Remote Control e os comandos locais são alternativas independentes; nenhum é dependência do outro.

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

O núcleo não exige serviço pago. Playwright, os perfis QA, relatórios, release gate, Remote Control e helpers de rede/desktop rodam localmente ou no runner escolhido pelo consumidor.
