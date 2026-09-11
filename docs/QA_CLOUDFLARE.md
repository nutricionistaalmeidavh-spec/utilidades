# ArtiSys QA Cloudflare Observability

This is an optional remote observability layer. Local QA, the LAN console, the Git bridge, Google Drive archive and the A/B updater continue to work independently if Cloudflare is unavailable.

## Existing production bindings

The Worker code expects exactly:

- `env.DB` -> Cloudflare D1
- `env.R2` -> R2 bucket `artisysqa`

The R2 catalog URI is not used at runtime. The Worker accesses R2 only through the `R2` binding.

## Worker root and entrypoint

For the Cloudflare repository integration, configure the Worker build root as:

`modules/artisys-qa/cloud/worker`

Entrypoint:

`src/index.js`

A template is available at `modules/artisys-qa/cloud/worker/wrangler.example.jsonc`. Do not copy its placeholder Worker name or D1 ID into production without replacing them with the existing Worker values.

## Required Worker secrets

Create these encrypted Worker secrets in Cloudflare:

- `ARTISYS_QA_AGENT_TOKEN` — write credential used only by the Windows QA Agent.
- `ARTISYS_QA_READ_TOKEN` — private read credential used by the remote dashboard/API.

Optional:

- `ARTISYS_QA_SHARE_TOKEN` — separate read-only token that enables `?share=...` on GET API requests for controlled external inspection. Never reuse the agent write token.

`GET /health` exposes only booleans showing whether DB/R2 and the secrets are configured. Secret values are never returned.

## D1

The Worker creates the required tables/indexes idempotently at runtime. The equivalent schema is also versioned at:

`modules/artisys-qa/cloud/worker/migrations/0001_init.sql`

D1 stores machines, projects, jobs, progress, events and artifact metadata.

## R2

R2 stores binary evidence under:

`projects/<projectId>/<jobId>/<relative-artifact-path>`

This includes screenshots, MP4/WebM videos, Playwright traces, reports and permitted logs. Nested paths are preserved to avoid collisions between artifacts with the same basename.

## API contract

Agent writes:

- `POST /api/v1/heartbeat`
- `POST /api/v1/jobs/:jobId/events`
- `POST /api/v1/jobs/:jobId/artifacts?...`

Read-only API:

- `GET /api/v1/snapshot`
- `GET /api/v1/history`
- `GET /api/v1/jobs/:jobId`
- `GET /api/v1/jobs/:jobId/events`
- `GET /api/v1/jobs/:jobId/artifacts`
- `GET /api/v1/artifacts/:artifactId`

`GET /` serves the mobile-friendly dashboard. It requests the read token in the browser and can show the current stage, timeline, history, screenshots and videos.

## Windows Agent connection

After the Worker is deployed, run from a checkout containing the current scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\modules\artisys-qa\scripts\setup-cloud.ps1 -Url https://SEU-WORKER.workers.dev
```

The script prompts securely for the same `ARTISYS_QA_AGENT_TOKEN` configured in the Worker, stores it only in the current Windows user's environment as `ARTISYS_QA_CLOUD_AGENT_TOKEN`, enables the Worker endpoint and restarts the scheduled QA agent so it inherits the variable.

Manual equivalent:

```powershell
artisys-qa-agent cloud enable --url https://SEU-WORKER.workers.dev
artisys-qa-agent cloud status
```

The agent token is never written to `agent-state.json` and is never printed by status commands.

## Assistant/read-only inspection

If remote inspection is desired without exposing the private dashboard token, configure `ARTISYS_QA_SHARE_TOKEN` and use read-only GET URLs such as:

`https://SEU-WORKER.workers.dev/api/v1/snapshot?share=<separate-read-only-share-token>`

The share token must be independent from the agent write credential. Rotate/remove it whenever external inspection is no longer needed.
