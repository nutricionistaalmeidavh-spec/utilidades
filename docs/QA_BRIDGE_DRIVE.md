# ArtiSys QA Bridge + Google Drive

## Purpose

Run whitelisted QA jobs on the install-once Windows agent without exposing the PC to the internet, then save evidence in a deterministic Google Drive location.

## Architecture

1. ChatGPT/Work writes a short-lived JSON job to the private `utilidades` repository.
2. The Windows agent polls the private repository outbound every ~60 seconds.
3. The agent validates machine, project, action, nonce and TTL before execution.
4. Only `quick`, `full`, `release`, `prints` and `video` are accepted.
5. The QA CLI executes with `shell: false`; arbitrary commands/arguments are rejected.
6. Evidence is written locally first.
7. The Drive uploader copies the run folder to Google Drive.
8. A local processed-job registry prevents replay. Failed Drive uploads are retried without rerunning QA.

## Drive root

- ArtiSys/QA: `1rG1_7zUPzfGsH-LYS7ovAjoAsx5u9151`
- ArtiSys/QA/Projetos: `1mb4R9Robq18JSXMxZiboOitoIjtYL70O`

The rclone remote is intentionally rooted at `ArtiSys/QA/Projetos`.

Each project gets one stable folder:

```text
ArtiSys/
  QA/
    Projetos/
      <projectId>/
        YYYY-MM-DD/
          <job-id>/
            bridge-result.json
            screenshots...
            videos...
            traces...
            reports...
```

Registering a project while Drive is enabled creates/confirms `<projectId>/` immediately.

## One-time Drive authorization

The uploader uses `rclone` because it is free/self-hosted and can upload large videos without a paid backend. The setup script installs rclone through WinGet when needed.

Use your own Google OAuth **Desktop app** client ID/secret. The shared rclone Google client is deliberately not the default because its shared client is being retired during 2026.

Set credentials only in the local terminal/environment; never commit them:

```powershell
$env:ARTISYS_GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
$env:ARTISYS_GOOGLE_CLIENT_SECRET="..."
powershell -ExecutionPolicy Bypass -File .\modules\artisys-qa\scripts\setup-drive.ps1
```

The browser authorization is performed by Google/rclone locally. The ArtiSys QA state stores only the rclone remote name and Drive root folder ID, not the Google client secret or access token.

## Agent commands

```powershell
artisys-qa-agent status
artisys-qa-agent bridge status
artisys-qa-agent bridge poll
artisys-qa-agent drive status
artisys-qa-agent drive enable
artisys-qa-agent drive disable
```

## Job contract

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

Maximum TTL: 30 minutes.

## Security boundaries

- No arbitrary shell.
- No inbound internet port.
- Repository write permission is the job-publishing authorization boundary.
- Jobs for unknown/disabled projects are rejected.
- Jobs for another machine are ignored.
- Unknown options are rejected.
- Processed IDs are locally remembered for 14 days.
- Visual regression remains opt-in.
- Drive upload is disabled until its remote is explicitly authorized locally.
