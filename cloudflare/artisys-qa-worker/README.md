# ArtiSys QA Cloud Worker

Backend opcional de observabilidade remota do ArtiSys QA. O QA local continua funcionando sem Cloudflare.

## Bindings esperados

- `env.DB` -> D1 `artisys-qa`
- `env.R2` -> R2 bucket `artisysqa`

## Secrets esperados

- `ARTISYS_QA_AGENT_TOKEN` -> autentica escrita do agente Windows
- `ARTISYS_QA_READ_TOKEN` -> autentica dashboard/API de leitura

Nunca comite os valores dos secrets.

## Estrutura

- `src/worker.js` -> entrypoint recomendado; dashboard remoto
- `src/api.js` -> implementação autenticada da API D1/R2
- `migrations/0001_init.sql` -> schema do D1
- `wrangler.jsonc.template` -> template de configuração; copie para `wrangler.jsonc` somente depois de preencher o nome real do Worker e o `database_id` real do D1

## Cloudflare Workers Builds

Para o repositório monorepo `utilidades`, configure no Worker conectado ao GitHub:

- Root directory: `cloudflare/artisys-qa-worker`
- Build command: vazio ou `npm install`
- Deploy command: `npx wrangler deploy --config wrangler.jsonc`
- Production branch: `main`

O nome em `wrangler.jsonc` precisa ser exatamente o nome do Worker já existente no dashboard.

## D1

Aplique `migrations/0001_init.sql` no banco `artisys-qa`. Via Wrangler, após criar o `wrangler.jsonc` real:

```powershell
cd cloudflare/artisys-qa-worker
npm install
npx wrangler d1 migrations apply artisys-qa --remote --config wrangler.jsonc
```

Também é possível executar o SQL da migration pelo console D1 no dashboard.

## Secrets

No dashboard do Worker, adicione dois Secrets criptografados com valores diferentes e aleatórios:

```text
ARTISYS_QA_AGENT_TOKEN
ARTISYS_QA_READ_TOKEN
```

O `ARTISYS_QA_AGENT_TOKEN` também deve existir apenas no PC que executa o ArtiSys QA Agent, como variável de ambiente `ARTISYS_QA_CLOUD_AGENT_TOKEN`.

## API

Escrita do agente:

```text
POST /api/v1/heartbeat
POST /api/v1/jobs/:jobId/events
POST /api/v1/jobs/:jobId/artifacts
```

Leitura autenticada:

```text
GET /api/v1/machines
GET /api/v1/jobs/current
GET /api/v1/history
GET /api/v1/jobs/:jobId
GET /api/v1/jobs/:jobId/events
GET /api/v1/jobs/:jobId/artifacts
GET /api/v1/artifacts/:artifactId
POST /api/v1/jobs/:jobId/share
```

`GET /health` é público e informa somente se os bindings `DB` e `R2` estão presentes.

## Links temporários para revisão externa

O dashboard pode gerar um link de leitura temporário de um job. O link expira em no máximo 1 hora e dá acesso somente ao job e aos artefatos daquele job. Isso permite compartilhar uma execução específica sem revelar `ARTISYS_QA_READ_TOKEN`.

## Configuração do agente Windows

Depois do Worker estar publicado e os secrets existirem, configure o endpoint e o token local sem colocá-lo no histórico do terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\modules\artisys-qa\scripts\setup-cloud.ps1 -Url https://SEU-WORKER.workers.dev
```

O script solicita o token de forma oculta, grava `ARTISYS_QA_CLOUD_AGENT_TOKEN` no ambiente do usuário Windows, habilita o endpoint e tenta reiniciar a tarefa `ArtiSys QA Agent`.

## Política de falha

Cloudflare é espelho de observabilidade. Falha de rede, D1, R2 ou Worker nunca deve alterar o resultado do QA local, o release gate, o upload para Drive ou o updater A/B.
