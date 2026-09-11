# ArtiSys QA Observability Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable near-real-time telemetry and a read-only LAN dashboard to the Windows ArtiSys QA Agent so local operators can see every remote QA stage, artifact, failure and stall without opening a terminal.

**Architecture:** Introduce a small agent-level telemetry core that persists an atomic current snapshot, bounded NDJSON events and per-job summaries under `%LOCALAPPDATA%/ArtiSys/QA/telemetry`. Existing bootstrap, bridge, QA runners and upload paths emit optional typed telemetry events. A separate authenticated HTTP console on port `4160` exposes read-only JSON endpoints and whitelisted artifact files; the first release stays LAN-only and read-only, while cloud mirroring remains an optional later adapter.

**Tech Stack:** Node.js 22+, native `http`, `fs/promises`, existing ArtiSys QA redaction/helpers, Windows Agent supervisor, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-11-artisys-qa-observability-console-design.md`

## Global Constraints

- Keep the current outbound bridge model; do not expose arbitrary inbound shell execution.
- Keep the existing per-project Remote Control intact.
- Preserve the A/B updater and automatic rollback behavior.
- Keep visual regression optional.
- Keep the core self-hosted and zero-license-cost.
- Never upload secrets, access tokens, OAuth credentials, environment values, or arbitrary process output without redaction.
- Do not make GitHub Actions mandatory.
- LAN console defaults to `127.0.0.1`; `0.0.0.0` requires an explicit LAN-enable setting and a separate console token.
- First release is read-only: no start, cancel, retry, shell, repository editing or arbitrary filesystem access endpoints.
- Telemetry failure must never fail the underlying QA job.

---

### Task 1: Durable telemetry store and state machine

**Files:**
- Create: `modules/artisys-qa/src/telemetry-store.js`
- Create: `modules/artisys-qa/tests/telemetry-store.test.js`
- Modify: `modules/artisys-qa/src/index.js`

**Interfaces:**
- Produces: `createTelemetryStore({ root, machineId, redact, now, maxEvents })`
- Produces methods: `getSnapshot()`, `transition(event)`, `heartbeat(detail)`, `recordArtifact(artifact)`, `readEvents({ jobId, limit })`, `readJob(jobId)`, `listHistory(limit)`, `recoverInterruptedJob()`.
- State values: `IDLE`, `QUEUED`, `SYNCING_PROJECT`, `INSTALLING_DEPENDENCIES`, `REGISTERING_PROJECT`, `STARTING_QA`, `RUNNING_QA`, `CAPTURING_ARTIFACTS`, `GENERATING_REPORT`, `UPLOADING_ARTIFACTS`, `PASSED`, `FAILED`, `EXPIRED`, `CANCELLED`, `STALLED`, `PENDING_UPLOAD`, `INTERRUPTED`.

- [ ] **Step 1: Write failing telemetry-store tests**

Create tests that assert:

```js
const telemetry = createTelemetryStore({ root, machineId: 'victor-pc', maxEvents: 4 });
await telemetry.transition({ jobId: 'job-1', projectId: 'pdv-artisys', stage: 'QUEUED', detail: 'Job discovered' });
await telemetry.transition({ jobId: 'job-1', projectId: 'pdv-artisys', stage: 'RUNNING_QA', detail: 'Flow smoke', progress: { current: 1, total: 3 } });
const snapshot = await telemetry.getSnapshot();
assert.equal(snapshot.currentJob.stage, 'RUNNING_QA');
assert.deepEqual(snapshot.currentJob.progress, { current: 1, total: 3 });
```

Also assert atomic snapshot persistence, event retention capped to `maxEvents`, invalid transitions rejected, redaction applied before persistence, artifact metadata recorded without exposing paths outside the QA root, and recovery changes a previously active job to `INTERRUPTED`.

- [ ] **Step 2: Run the new test file and verify failure**

Run:

```bash
cd modules/artisys-qa
node --test tests/telemetry-store.test.js
```

Expected: FAIL because `src/telemetry-store.js` does not exist.

- [ ] **Step 3: Implement the telemetry store**

Implement:

```js
export const ACTIVE_JOB_STAGES = new Set([
  'QUEUED','SYNCING_PROJECT','INSTALLING_DEPENDENCIES','REGISTERING_PROJECT',
  'STARTING_QA','RUNNING_QA','CAPTURING_ARTIFACTS','GENERATING_REPORT','UPLOADING_ARTIFACTS'
]);

export const TERMINAL_JOB_STAGES = new Set([
  'PASSED','FAILED','EXPIRED','CANCELLED','STALLED','PENDING_UPLOAD','INTERRUPTED'
]);
```

Persist files under `path.join(root, 'telemetry')` using temp-file + rename for `current.json` and `jobs/<job-id>.json`; keep `events.ndjson` bounded by rewriting the last `maxEvents` records after append. Every event must be normalized to known fields only and passed through the existing secret redaction helper before disk write.

- [ ] **Step 4: Run telemetry tests**

Run:

```bash
cd modules/artisys-qa
node --test tests/telemetry-store.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/artisys-qa/src/telemetry-store.js modules/artisys-qa/src/index.js modules/artisys-qa/tests/telemetry-store.test.js
git commit -m "feat(qa): add durable agent telemetry store"
```

---

### Task 2: Instrument managed-project bootstrap and bridge lifecycle

**Files:**
- Modify: `modules/artisys-qa/src/project-bootstrap.js`
- Modify: `modules/artisys-qa/src/bridge-worker.js`
- Modify: `modules/artisys-qa/tests/project-bootstrap.test.js`
- Create: `modules/artisys-qa/tests/bridge-telemetry.test.js`

**Interfaces:**
- Consumes: optional `telemetry` object implementing `transition(event)` and `heartbeat(detail)`.
- Produces: explicit lifecycle transitions without changing behavior when `telemetry` is absent.

- [ ] **Step 1: Add failing bootstrap telemetry tests**

Assert that a managed project emits, in order:

```text
SYNCING_PROJECT
INSTALLING_DEPENDENCIES   # only when setup runs
REGISTERING_PROJECT
```

and that setup failures emit `FAILED` with a redacted error detail while preserving the existing return shape.

- [ ] **Step 2: Add failing bridge telemetry tests**

Use a fake telemetry recorder and assert a discovered valid job emits:

```text
QUEUED
STARTING_QA
RUNNING_QA
UPLOADING_ARTIFACTS
PASSED
```

For failed process execution, assert final `FAILED`. For successful QA with failed upload, assert `PENDING_UPLOAD` instead of changing the QA result itself.

- [ ] **Step 3: Run focused tests and confirm failure**

```bash
cd modules/artisys-qa
node --test tests/project-bootstrap.test.js tests/bridge-telemetry.test.js
```

Expected: FAIL because telemetry injection and events are not implemented.

- [ ] **Step 4: Implement optional instrumentation**

Change public signatures to accept optional telemetry without breaking existing callers:

```js
export async function syncManagedProjects({ root, controlRepoDir, ref = 'main', logger = console, telemetry = null } = {})
```

and:

```js
export async function bridgePollOnce({ root = defaultAgentRoot(), repoDir = REPO_DIR, logger = console, telemetry = null } = {})
```

Wrap telemetry calls in a best-effort helper:

```js
async function emit(telemetry, event) {
  try { await telemetry?.transition(event); } catch {}
}
```

Never allow telemetry exceptions to change project sync or QA behavior.

- [ ] **Step 5: Run focused tests**

```bash
cd modules/artisys-qa
node --test tests/project-bootstrap.test.js tests/bridge-telemetry.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa/src/project-bootstrap.js modules/artisys-qa/src/bridge-worker.js modules/artisys-qa/tests/project-bootstrap.test.js modules/artisys-qa/tests/bridge-telemetry.test.js
git commit -m "feat(qa): instrument bridge and project bootstrap"
```

---

### Task 3: Add QA progress hooks and artifact discovery

**Files:**
- Modify: `modules/artisys-qa/src/profile-runner.js`
- Modify: `modules/artisys-qa/src/runner.js`
- Modify: `modules/artisys-qa/src/drive-uploader.js`
- Create: `modules/artisys-qa/src/artifact-index.js`
- Create: `modules/artisys-qa/tests/progress-hooks.test.js`
- Create: `modules/artisys-qa/tests/artifact-index.test.js`

**Interfaces:**
- Produces optional callback: `onProgress(event)` where `event` is `{ kind, flow, step, status, current, total, artifact? }`.
- Produces: `scanQaArtifacts({ rootDir, artifactRoot })` returning safe metadata only.
- Consumes: telemetry adapter in bridge worker to translate progress into state/detail/progress updates.

- [ ] **Step 1: Write failing progress-hook tests**

Assert profile execution calls `onProgress` for profile start, each flow start/end, desktop-smoke start/end and release gate result. Assert a flow runner emits step start/end where step information exists.

- [ ] **Step 2: Write failing artifact-index tests**

Create temporary screenshot/video/report files under a temporary artifact root and assert:

```js
[
  { type: 'screenshot', name: 'step-01.png', size: 123, createdAt: '...', localPath: '...' },
  { type: 'video', name: 'run.webm', size: 456, createdAt: '...', localPath: '...' }
]
```

Reject symlinks or canonical paths escaping the artifact root.

- [ ] **Step 3: Run tests and verify failure**

```bash
cd modules/artisys-qa
node --test tests/progress-hooks.test.js tests/artifact-index.test.js
```

Expected: FAIL because hooks/index do not exist.

- [ ] **Step 4: Implement progress callbacks and artifact metadata**

Add optional `onProgress = null` parameters to runner functions. Emit events without awaiting user code in a way that can fail the QA run; route callback invocation through a guarded helper. In the uploader, emit `UPLOADING_ARTIFACTS` before upload and final upload metadata after completion.

- [ ] **Step 5: Run tests**

```bash
cd modules/artisys-qa
node --test tests/progress-hooks.test.js tests/artifact-index.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa/src/profile-runner.js modules/artisys-qa/src/runner.js modules/artisys-qa/src/drive-uploader.js modules/artisys-qa/src/artifact-index.js modules/artisys-qa/tests/progress-hooks.test.js modules/artisys-qa/tests/artifact-index.test.js
git commit -m "feat(qa): expose live QA progress and artifacts"
```

---

### Task 4: Build the authenticated read-only LAN console

**Files:**
- Create: `modules/artisys-qa/src/agent-console.js`
- Create: `modules/artisys-qa/tests/agent-console.test.js`
- Modify: `modules/artisys-qa/src/agent-state.js`
- Modify: `modules/artisys-qa/src/agent-cli.mjs`
- Modify: `modules/artisys-qa/src/index.js`

**Interfaces:**
- Produces: `createAgentConsole({ host, port, token, telemetry, agentState, artifactRoot })`
- Default port: `4160`.
- Read-only endpoints: `/api/agent`, `/api/projects`, `/api/jobs/current`, `/api/jobs/:id`, `/api/jobs/:id/events`, `/api/jobs/:id/artifacts`, `/api/history`, `/artifacts/:jobId/:relativePath`.

- [ ] **Step 1: Write failing authentication and binding tests**

Assert:

```js
assert.rejects(
  () => createAgentConsole({ host: '0.0.0.0', port: 4160, token: '', telemetry }),
  /token/i
);
```

Also assert loopback may start with generated token, LAN mode requires explicit enabled state, unauthorized API calls return `401`, and all responses include `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

- [ ] **Step 2: Write failing artifact path traversal tests**

Request paths such as:

```text
/artifacts/job-1/../../agent-state.json
/artifacts/job-1/%2e%2e/%2e%2e/agent-state.json
```

Expected: `400` or `404`, never file contents.

- [ ] **Step 3: Write failing endpoint tests**

Use a fake telemetry store and assert the exact endpoint responses for current job, history, events, projects and artifacts. Verify there are no POST/PUT/PATCH/DELETE control routes.

- [ ] **Step 4: Run console tests and verify failure**

```bash
cd modules/artisys-qa
node --test tests/agent-console.test.js
```

Expected: FAIL because console server does not exist.

- [ ] **Step 5: Implement the console server**

Use native `http`. Reuse constant-time bearer-token comparison style from `remote-control.js`. Resolve artifact requests with `path.resolve()` and require the resolved path to stay inside the configured artifact root before reading. Serve only known artifact MIME types (`image/png`, `image/jpeg`, `video/webm`, `video/mp4`, `application/json`, `text/html`, `application/zip`, `text/plain`).

Add agent state defaults:

```js
console: {
  enabled: true,
  lanEnabled: false,
  host: '127.0.0.1',
  port: 4160,
  token: '<generated-local-secret>'
}
```

Expose CLI read/config commands only; do not add run/cancel controls in this release.

- [ ] **Step 6: Run console tests**

```bash
cd modules/artisys-qa
node --test tests/agent-console.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/artisys-qa/src/agent-console.js modules/artisys-qa/src/agent-state.js modules/artisys-qa/src/agent-cli.mjs modules/artisys-qa/src/index.js modules/artisys-qa/tests/agent-console.test.js
git commit -m "feat(qa): add read-only LAN observability console"
```

---

### Task 5: Integrate telemetry, heartbeat, stall detection and restart recovery into the Agent supervisor

**Files:**
- Modify: `modules/artisys-qa/src/agent-supervisor.js`
- Modify: `modules/artisys-qa/src/bridge-worker.js`
- Create: `modules/artisys-qa/tests/agent-observability.test.js`

**Interfaces:**
- Consumes: telemetry store and agent console from Tasks 1 and 4.
- Produces: one long-lived agent heartbeat and console lifecycle managed by the supervisor.

- [ ] **Step 1: Write failing supervisor integration tests**

Assert startup:

1. constructs telemetry using the existing agent root and machine ID;
2. calls `recoverInterruptedJob()` before bridge polling;
3. starts console once;
4. updates heartbeat at least every 2 seconds while active in tests using an injectable interval;
5. closes the console during supervisor stop.

- [ ] **Step 2: Write failing stall detection test**

Inject a fake clock. Put a job in `RUNNING_QA`, stop heartbeats, advance beyond the configured threshold and assert the telemetry snapshot reports `STALLED` while preserving the last known job and artifacts.

- [ ] **Step 3: Run tests and verify failure**

```bash
cd modules/artisys-qa
node --test tests/agent-observability.test.js
```

Expected: FAIL because supervisor does not own telemetry/console yet.

- [ ] **Step 4: Implement supervisor wiring**

Create telemetry once after state load, pass it into bridge polling, start the console with the configured host/port/token, and maintain heartbeat/stall evaluation on a bounded timer. Console or telemetry failures must be logged and degraded without terminating the agent supervisor.

- [ ] **Step 5: Run integration tests**

```bash
cd modules/artisys-qa
node --test tests/agent-observability.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa/src/agent-supervisor.js modules/artisys-qa/src/bridge-worker.js modules/artisys-qa/tests/agent-observability.test.js
git commit -m "feat(qa): wire live observability into agent supervisor"
```

---

### Task 6: Add the responsive dashboard UI and release the feature

**Files:**
- Modify: `modules/artisys-qa/src/agent-console.js`
- Create: `modules/artisys-qa/tests/agent-console-ui.test.js`
- Modify: `modules/artisys-qa/README.md`
- Modify: `modules/artisys-qa/module.json`
- Modify: `modules/artisys-qa/package.json`
- Modify: `modules/artisys-qa/package-lock.json`
- Modify: `modules/artisys-qa/stable-channel.json`

**Interfaces:**
- Dashboard consumes only the read-only JSON endpoints from Task 4.
- No new mutation endpoints.

- [ ] **Step 1: Write failing UI contract tests**

Assert `/` returns HTML containing:

```text
ArtiSys QA Console
Agent
Projetos
Job atual
Timeline
Artefatos
Histórico
```

Assert client polling uses `GET` only and no control button labels such as `Executar`, `Cancelar` or `Retry` exist.

- [ ] **Step 2: Run UI test and verify failure**

```bash
cd modules/artisys-qa
node --test tests/agent-console-ui.test.js
```

Expected: FAIL because the final dashboard HTML is not implemented.

- [ ] **Step 3: Implement responsive dashboard HTML**

Render a mobile-first dashboard that polls `/api/agent` and `/api/jobs/current` every 1500 ms while active and every 5000 ms while idle. Show:

- version, machine ID, heartbeat, bridge and Drive state;
- project runner list;
- state-machine timeline;
- current flow/test detail;
- progress current/total and elapsed time;
- latest bounded logs/events;
- screenshot thumbnails linked to authenticated local artifact URLs;
- video/report/trace links after metadata exists;
- recent history.

Use no external CDN dependencies and preserve the same CSP hardening approach as the existing Remote Control.

- [ ] **Step 4: Update documentation and module capability metadata**

Document exact commands for:

```powershell
artisys-qa-agent console status
artisys-qa-agent console token
artisys-qa-agent console lan on
artisys-qa-agent console lan off
```

Document that LAN mode requires Windows Firewall access to TCP 4160 on the private network profile and that the token must not be shared publicly.

Add module capabilities for durable telemetry, heartbeat/stall detection, restart recovery, read-only LAN console and authenticated artifact preview.

- [ ] **Step 5: Bump release version and stable channel**

Increment the package/module/stable version consistently to the next patch release after the current version, and update the stable-channel notes to describe the observability console. Keep `minimumNode` at `22`.

- [ ] **Step 6: Run the complete module verification**

```bash
cd modules/artisys-qa
npm ci
npm test
npm run check
npm pack --dry-run
```

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/artisys-qa/src/agent-console.js modules/artisys-qa/tests/agent-console-ui.test.js modules/artisys-qa/README.md modules/artisys-qa/module.json modules/artisys-qa/package.json modules/artisys-qa/package-lock.json modules/artisys-qa/stable-channel.json
git commit -m "feat(qa): release agent observability console"
```

---

### Task 7: Windows end-to-end verification with PDV-ARTISYS

**Files:**
- No source changes unless a verified defect is found.
- Evidence expected under `%LOCALAPPDATA%/ArtiSys/QA/artifacts/pdv-artisys/` and telemetry under `%LOCALAPPDATA%/ArtiSys/QA/telemetry/`.

**Interfaces:**
- Validates the complete release against the existing `pdv-artisys` managed project and bridge.

- [ ] **Step 1: Update the local Windows agent to the new stable release**

Run:

```powershell
artisys-qa-agent check-update
artisys-qa-agent status
```

Expected: active version equals the newly released stable version and health is `running`.

- [ ] **Step 2: Enable LAN console explicitly**

```powershell
artisys-qa-agent console lan on
artisys-qa-agent console token
artisys-qa-agent console status
```

Expected: console binds on port `4160`, LAN mode reports enabled, and the token is displayed only on demand.

- [ ] **Step 3: Open the console from another device on the same private LAN**

Use `http://<windows-lan-ip>:4160`, enter the console token, and verify agent/project state loads without terminal interaction.

- [ ] **Step 4: Dispatch a fresh PDV-ARTISYS release QA bridge job**

Queue one new `release` action targeted at the current machine ID. Verify the dashboard transitions through the expected stages and updates within approximately 2 seconds locally.

- [ ] **Step 5: Verify live artifacts and final result**

Confirm screenshots appear as they are created; confirm video/report/trace metadata appears when files exist; confirm final `PASSED`, `FAILED` or `PENDING_UPLOAD` matches the bridge result and does not disappear after agent restart.

- [ ] **Step 6: Verify negative security cases manually**

From the second device, confirm an invalid token gets `401`, a traversal artifact URL cannot read outside the artifact root, and no mutation/control endpoint exists.

- [ ] **Step 7: Verify restart recovery**

Start a disposable QA run, restart the agent during execution, and verify the prior active job is retained as `INTERRUPTED` with its existing evidence preserved.

- [ ] **Step 8: Record verification result in the PR**

Post the final Windows verification summary with agent version, console URL pattern, tested project ID, job ID, terminal state, artifact availability and any limitations discovered.
