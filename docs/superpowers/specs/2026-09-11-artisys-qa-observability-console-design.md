# ArtiSys QA Observability Console — Design

Date: 2026-09-11
Status: Proposed for implementation
Owner: ArtiSys

## 1. Goal

Make the Windows ArtiSys QA Agent fully observable during remote runs so both the operator on the local network and an external controller can distinguish `queued`, `syncing`, `installing`, `starting`, `testing`, `capturing`, `uploading`, `passed`, `failed`, and `stalled` states in near real time.

The immediate target is local-network visibility without opening a terminal. The design also defines a cloud telemetry adapter so the same state can later be mirrored through Cloudflare Worker + D1 and artifacts through R2, while Google Drive remains an optional final archive.

## 2. Existing system constraints

- Keep the current outbound bridge model; do not expose arbitrary inbound shell execution.
- Keep the existing per-project Remote Control intact.
- Preserve the A/B updater and automatic rollback behavior.
- Keep visual regression optional.
- Keep the core self-hosted and zero-license-cost.
- Never upload secrets, access tokens, OAuth credentials, environment values, or arbitrary process output without redaction.
- Do not make GitHub Actions mandatory.

## 3. Recommended architecture

### 3.1 Agent-level telemetry core

Add one agent-level telemetry service shared by the updater, project bootstrap, bridge worker, QA runner, artifact capture and Drive uploader.

The service owns:

- current agent heartbeat;
- current job state;
- current stage and stage detail;
- bounded event history;
- current project status;
- progress counters when known;
- latest artifact metadata;
- last failure and diagnostic summary.

Local state is persisted under the agent root, for example:

```text
%LOCALAPPDATA%/ArtiSys/QA/telemetry/
  current.json
  events.ndjson
  jobs/<job-id>.json
```

`current.json` is the authoritative snapshot for the LAN console. `events.ndjson` is append-only, bounded/rotated, and suitable for debugging. Job JSON contains the durable summary needed after restart.

### 3.2 Explicit state machine

Every bridge job follows this state model:

```text
QUEUED
  -> SYNCING_PROJECT
  -> INSTALLING_DEPENDENCIES (only when needed)
  -> REGISTERING_PROJECT
  -> STARTING_QA
  -> RUNNING_QA
  -> CAPTURING_ARTIFACTS
  -> GENERATING_REPORT
  -> UPLOADING_ARTIFACTS
  -> PASSED | FAILED
```

Additional terminal/diagnostic states:

```text
EXPIRED
CANCELLED
STALLED
PENDING_UPLOAD
```

Each transition records:

- timestamp;
- jobId;
- projectId;
- machineId;
- stage;
- human-readable detail;
- progress current/total when known;
- elapsed time;
- optional flow/test name;
- optional error code/message after redaction.

A heartbeat is updated while any long-running step is active. If the heartbeat is older than a configured threshold while the process is expected to be active, the console marks the job `STALLED` without destroying the underlying evidence.

## 4. LAN Console

Add a dedicated agent-level HTTP server, separate from the per-project Remote Control, with a default port reserved for the console (proposed `4160`).

Default behavior:

- bind to `127.0.0.1` unless LAN access is explicitly enabled;
- when LAN is enabled, bind to `0.0.0.0` and require a token;
- no arbitrary shell endpoint;
- read-only in the first release;
- no CORS wildcard;
- `Cache-Control: no-store`;
- content-security-policy and MIME hardening equivalent to the existing Remote Control.

### 4.1 Read-only endpoints

```text
GET /api/agent
GET /api/projects
GET /api/jobs/current
GET /api/jobs/:id
GET /api/jobs/:id/events
GET /api/jobs/:id/artifacts
GET /api/history
```

The browser UI polls lightweight status endpoints every 1-2 seconds while a job is active and more slowly when idle.

### 4.2 Dashboard content

The dashboard shows:

- agent version, machine ID, heartbeat and uptime;
- bridge and Drive status;
- registered projects and runner state;
- current job with state-machine timeline;
- current flow/test and elapsed time;
- passed/failed counters when available;
- latest bounded logs;
- screenshots as they are created;
- video/report/trace links after they exist;
- recent job history with result and duration.

The first release is deliberately read-only. Start/cancel/retry controls can be added later behind explicit capability gates after the observability path is proven stable.

## 5. Instrumentation points

### 5.1 Project bootstrap

Emit transitions for:

- repository discovery;
- clone/fetch start and completion;
- dependency installation start and completion;
- config validation;
- registration completion;
- bootstrap failure.

### 5.2 Bridge worker

Emit transitions for:

- job discovered;
- validation accepted/rejected;
- project selected;
- QA process spawned;
- QA process exit;
- artifact upload start/end;
- persisted final result.

### 5.3 QA profile runner / flow runner

Expose progress hooks so the telemetry layer can publish:

- profile start;
- flow start/end;
- step start/end when available;
- screenshot/video artifact creation;
- desktop smoke start/end;
- release gate result.

The telemetry API must remain optional so existing consumers that do not use the Windows Agent are not broken.

## 6. Artifact model

Artifacts stay on disk first. Metadata is published immediately to telemetry.

For each artifact record:

```json
{
  "type": "screenshot|video|trace|report|log",
  "name": "...",
  "localPath": "...",
  "createdAt": "...",
  "size": 12345,
  "uploaded": false,
  "provider": null,
  "remoteKey": null
}
```

The LAN console may serve local artifacts only through authenticated, path-whitelisted endpoints rooted under the QA artifact directory. It must never serve arbitrary filesystem paths.

## 7. Cloud extension: Cloudflare Worker + D1 + R2

This is an adapter, not a hard dependency of the QA core.

### D1

Store structured telemetry and job history:

- agents;
- projects;
- jobs;
- job_events;
- artifacts metadata;
- heartbeats.

### R2

Store heavy evidence:

- screenshots;
- video;
- traces;
- HTML/JSON reports;
- optional diagnostic bundles.

### Worker API

The agent uses authenticated outbound HTTPS calls only. The Worker exposes a separate read-only API for external inspection. Artifact access should use short-lived signed URLs or a Worker proxy that enforces authorization.

This makes it possible for an external controller to inspect live state and artifacts without direct LAN access to the Windows PC.

## 8. Security model

- Generate a separate console token from project Remote Control tokens.
- Never log tokens.
- Apply existing secret redaction before persisting logs/events.
- Allow only known telemetry fields; reject arbitrary payload objects in the cloud adapter.
- Bound event size and history retention.
- LAN artifact serving is restricted to the QA artifact root after canonical path resolution.
- Cloud uploads are outbound only.
- Cloud credentials live in local environment/config, not in repository files or telemetry output.
- Cloud adapter failure must never block or fail the underlying QA job; it degrades to local telemetry and marks sync as unavailable.

## 9. Error handling and restart recovery

On agent restart:

- load the last durable job snapshot;
- if a job was `RUNNING_*` but its process no longer exists, mark it `INTERRUPTED`/`FAILED` with restart context;
- preserve local artifacts;
- retry pending remote/Drive uploads independently;
- resume heartbeat immediately.

A telemetry write failure must not crash the QA process. Writes use temp-file + atomic rename for snapshots and append with bounded rotation for event logs.

## 10. Rollout

### Release A — local observability foundation

- telemetry store and state machine;
- instrumentation for bootstrap, bridge, QA and uploads;
- agent heartbeat;
- read-only LAN console;
- authenticated local artifact preview;
- tests for transitions, redaction, path traversal and restart recovery.

### Release B — cloud telemetry adapter

- Cloudflare Worker contract;
- D1 schema/migrations;
- R2 artifact upload;
- signed/read-only artifact access;
- cloud sync retry queue;
- remote dashboard/API.

Release B is enabled only after the user provides/configures the Cloudflare resources and credentials locally.

## 11. Testing strategy

Required automated coverage:

- state transition validity;
- heartbeat/stall detection;
- event retention and rotation;
- restart recovery;
- bridge instrumentation;
- bootstrap instrumentation;
- QA progress hooks;
- token authentication;
- LAN binding rules;
- artifact path allowlist and traversal rejection;
- secret redaction;
- cloud adapter failure isolation;
- existing ArtiSys QA tests remain green.

Manual verification on Windows:

1. install/update agent;
2. enable LAN console;
3. open console from another device on the same network;
4. dispatch a QA job through the bridge;
5. verify stage progression without terminal access;
6. verify screenshots appear as created;
7. verify video/report links after creation;
8. force an upload failure and confirm QA result remains intact;
9. restart agent during a run and confirm interrupted-state recovery.

## 12. Acceptance criteria

The feature is complete when:

- the operator can open one LAN URL and see whether the agent is idle, syncing, installing, testing, capturing, uploading, passed, failed or stalled;
- status updates are visible within about 2 seconds locally;
- the current project, flow/test and elapsed time are visible when known;
- screenshots can be previewed from the LAN console as they are produced;
- video/report/trace artifacts are listed when available;
- no arbitrary filesystem path or shell command is exposed;
- the existing bridge, updater, Drive uploader and per-project Remote Control continue to work;
- cloud telemetry remains optional and cannot break local QA execution.

## 13. Non-goals for the first release

- internet-exposed inbound control of the Windows PC;
- arbitrary command execution;
- replacing Google Drive immediately;
- editing project source from the console;
- start/cancel/retry buttons before read-only observability is proven stable.
