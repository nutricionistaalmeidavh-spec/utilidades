# ArtiSys QA Bridge

This directory is the control plane for the install-once Windows QA Agent.

## Security model

- The agent polls the configured **private Git repository** outbound; no inbound PC port is exposed to the internet.
- Only `quick`, `full`, `release`, `prints`, and `video` actions are accepted.
- Arbitrary shell commands and arbitrary CLI arguments are rejected.
- Every job must identify a registered `projectId`, target a machine (or `*`), include a nonce, and expire within 30 minutes.
- Processed job IDs are persisted locally for 14 days to block replay.
- GitHub repository access controls are the authorization boundary for publishing jobs.

## Job path

Create JSON files under:

`modules/artisys-qa/bridge/jobs/pending/<job-id>.json`

Example:

```json
{
  "id": "job-20260911-pdv-full-001",
  "nonce": "0123456789abcdef0123456789abcdef",
  "machineId": "DESKTOP-ABC-123456789abc",
  "projectId": "pdv-nexus",
  "action": "full",
  "requestedAt": "2026-09-11T18:30:00.000Z",
  "expiresAt": "2026-09-11T18:50:00.000Z",
  "options": {
    "viewport": "desktop",
    "visual": true
  }
}
```

The agent ignores jobs for other machines, expired jobs, unknown projects, invalid options, and already-processed IDs.

## Drive layout

The configured Google Drive root is `ArtiSys/QA/Projetos`.

Each registered project is isolated by deterministic `projectId`:

`<projectId>/<YYYY-MM-DD>/<job-id>/`

That run folder receives screenshots, videos, traces, logs, reports, and `bridge-result.json` when produced by the selected QA flow.
