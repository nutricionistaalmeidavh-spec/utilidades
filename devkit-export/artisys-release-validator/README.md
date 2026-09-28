# ArtiSys Release Validator

Validador reutilizável de releases ArtiSys para execução local ou em CI. Ele testa o **artefato que será distribuído** por meio de um perfil definido pelo produto consumidor e gera um gate `APPROVED`/`BLOCKED` com SHA-256 e relatórios JSON/HTML.

O módulo não exige SaaS, daemon, máquina permanente nem runner self-hosted. Para produtos Windows, o uso recomendado é em runners efêmeros `windows-latest` do GitHub Actions.

## O que ele resolve

O `artisys-release-validator` cobre a etapa posterior ao build: instalar, iniciar, consultar health checks, executar cenários do consumidor, repetir stress, validar upgrade, desinstalar/reinstalar e registrar evidências. As ações disponíveis no núcleo são genéricas:

- comando/processo com argumentos separados e `shell: false`;
- probe HTTP com timeout;
- instalação/desinstalação NSIS silenciosa;
- grupos de cenários definidos pelo produto;
- repetição para stress;
- SHA-256 do artefato;
- relatórios `validation-report.json` e `validation-report.html`.

`artisys-release` e `artisys-release-validator` são complementares. O primeiro coordena gates gerais de publicação; o segundo executa a validação do artefato instalado e dos cenários específicos fornecidos pelo produto.

## Uso programático

```js
import { validateRelease } from '@artisys/release-validator';

const result = await validateRelease({
  profile: {
    schemaVersion: 1,
    product: 'Meu Produto',
    version: '1.0.0',
    artifact: 'dist/Meu-Produto-Setup.exe',
    workspace: '.tmp/release-validation',
    reportDir: 'dist/validation',
    phases: [
      {
        id: 'install',
        action: { type: 'nsis-install' }
      },
      {
        id: 'boot',
        action: {
          type: 'command',
          file: 'C:\\Program Files\\Meu Produto\\Meu Produto.exe',
          args: ['--validation-mode']
        }
      }
    ]
  }
});

if (result.status !== 'APPROVED') process.exitCode = 1;
```

## CLI

Um módulo `.mjs` exporta `{ profile, executePhase? }`:

```bash
artisys-release-validator ./release-validation.config.mjs
```

O processo termina com:

- `0` quando `APPROVED`;
- `1` quando `BLOCKED`;
- `2` para erro de configuração/execução da CLI.

## Perfil

Campos principais:

| Campo | Regra |
|---|---|
| `schemaVersion` | deve ser `1` |
| `product` | identificador/nome do produto |
| `version` | versão sob validação |
| `artifact` | artefato principal a validar |
| `workspace` | diretório isolado usado pelo consumidor |
| `reportDir` | opcional; padrão `<workspace>/release-validation` |
| `phases` | lista ordenada e não vazia |
| `scenarios` | cenários específicos do produto, opcional |
| `redact` | strings que devem ser removidas de evidências |

Cada fase/cenário aceita `id`, `required` (padrão `true`), `timeoutMs` e `repeat` (padrão `1`). Uma fase obrigatória que não termina em `pass` bloqueia a release e interrompe as fases posteriores.

## Ações declarativas

```js
{ type: 'command', file: process.execPath, args: ['script.mjs'] }
{ type: 'http', url: 'http://127.0.0.1:4174/health', expectedStatus: [200] }
{ type: 'nsis-install', installer: 'dist/App-Setup.exe' }
{ type: 'nsis-uninstall', uninstaller: 'C:\\Program Files\\App\\Uninstall.exe' }
{ type: 'scenarios', ids: ['sale', 'backup-restore'] }
{ type: 'noop' }
```

Ações `command` nunca usam `shell: true`; executável e argumentos são enviados separadamente. O consumidor continua responsável por escolher paths/workspaces seguros e por não apontar fases destrutivas para dados reais.

## Cenários do produto

O módulo não conhece regras como venda, estoque, obra ou prontuário. Essas regras ficam no repositório consumidor:

```js
scenarios: [
  {
    id: 'core-smoke',
    action: {
      type: 'command',
      file: process.execPath,
      args: ['scripts/release-smoke.mjs']
    }
  },
  {
    id: 'stress',
    repeat: 1000,
    action: {
      type: 'command',
      file: process.execPath,
      args: ['scripts/one-validation-iteration.mjs']
    }
  }
]
```

Uma fase `{ type: 'scenarios' }` executa a lista. Isso mantém o kit reutilizável sem acoplar domínio de nenhum produto.

## Limitações

- Homologação física de impressora, balança, gaveta ou outro dispositivo exige evidência real externa.
- O módulo não assina, publica ou distribui releases.
- O helper NSIS cobre o modo silencioso padrão (`/S`); opções adicionais continuam definidas pelo instalador consumidor.
- O produto é responsável por implementar seu modo de validação, health check e cenários de negócio.

## Verificação do módulo

```bash
npm test
npm run check
npm run example
npm pack --dry-run
```

O CI dedicado executa o contrato em Linux e Windows para garantir que o núcleo e a CLI permaneçam portáveis.
