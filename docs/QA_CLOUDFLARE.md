# ArtiSys QA Cloudflare Observability

This layer mirrors the local Windows ArtiSys QA Agent to Cloudflare without making Cloudflare a dependency of QA execution.

## Fixed bindings

The Worker expects exactly these bindings:

- `env.DB` -> Cloudflare D1 database
- `env.R2` -> R2 bucket `artisysqa`

The repository does not hard-code a D1 database ID. The production binding can remain configured in the Cloudflare dashboard, or `cloud/worker/wrangler.example.jsonc` can be copied to `wrangler.jsonc` after inserting the real D1 ID.

## Worker entrypoint

Use:

`modules/artisys-qa/cloud/worker/src/index.js`

The Worker automatically creates the required D1 tables and indexes with `CREATE ... IF NOT EXISTS`. The same schema is also available as:

`modules/artisys-qa/cloud/worker/migrations/0001_init.sql`

## Required Worker secrets

Configure these as Cloudflare Worker secrets, never repository variables:

- `ARTISYS_QA_AGENT_TOKEN`: write-only agent credential used by the Windows QA Agent.
- `ARTISYS_QA_READ_TOKEN`: private read credential for the remote dashboard/API.
- `ARTISYS_QA_SHARE_TOKEN`: optional dedicated read-only share token for temporary/external inspection. Do not reuse the agent token.

The code fails closed when a required credential is absent. D1/R2 bindings are also checked at `/health`.

## API

Agent writes:

- `POST /api/v1/heartbeat`
- `POST /api/v1/jobs/upsert`
- `POST /api/v1/events`
- `PUT /api/v1/artifacts/:jobId/:name`

Private/read-only views:

- `GET /api/v1/snapshot`
- `GET /api/v1/history`
- `GET /api/v1/jobs/:jobId`
- `GET /api/v1/jobs/:jobId/events`
- `GET /api/v1/jobs/:jobId/artifacts`
- `GET /api/v1/artifacts/:artifactId`

`GET /` serves a mobile-friendly read-only dashboard. It asks for `ARTISYS_QA_READ_TOKEN` locally in the browser and does not store it in the repository.

For external read-only inspection, API GET endpoints also accept `?share=<ARTISYS_QA_SHARE_TOKEN>`. This token is intentionally separate from both the agent write token and the private dashboard read token.

## Windows Agent setup

After the Worker is deployed, set the Worker URL on the Agent:

```powershell
artisys-qa-agent cloud enable --endpoint https://SEU-WORKER.workers.dev
```

The agent write token is never stored in `agent-state.json`. By default it is read from:

`ARTISYS_QA_CLOUD_AGENT_TOKEN`

Recommended setup helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\modules\artisys-qa\scripts\setup-cloud.ps1 -Endpoint https://SEU-WORKER.workers.dev
```

The helper prompts for the secret securely, stores it in the current Windows user's environment and runs `artisys-qa-agent cloud test`.

## Failure isolation

Cloud mirroring is best-effort. A Cloudflare outage, D1 error, R2 error, timeout or invalid remote response only updates the Agent's cloud status/log. It must never change a local QA pass/fail result, bridge behavior, Drive archive or A/B update behavior.

## Storage model

D1 stores machine state, projects, jobs, progress, events and artifact metadata.

R2 stores binary evidence under deterministic keys:

`projects/<projectId>/<jobId>/<artifact-name>`

Typical objects include screenshots, videos, traces, reports and permitted logs.

## Existing user configuration

Current expected production names from the configured Cloudflare account:

- D1 binding: `DB`
- R2 binding: `R2`
- R2 bucket/catalog: `artisysqa`

The catalog URI is not used by the Agent or Worker runtime. Runtime access is exclusively through the `env.R2` binding.
