# ArtiSys QA 1.2.0 Demo Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `@artisys/qa` into a reusable demo-account, workspace, fixture and flow orchestration platform for web and Electron consumers while preserving all 1.1.1 behavior.

**Architecture:** Add an adapter-driven demo-profile orchestration layer around the existing manifest/runner/demo pipeline. The shared module owns lifecycle, fixture and flow composition; each consumer owns only product-specific account/workspace operations and capability mappings. Secrets remain environment-only and emitted summaries are sanitized.

**Tech Stack:** Node.js >=22, ES modules, Playwright >=1.51 <2, Node test runner, GitHub Actions, ffmpeg/ffprobe for media normalization.

**Spec:** `docs/superpowers/specs/2026-09-10-artisys-qa-demo-platform-1.2-design.md`

## Global Constraints

- Remain backward-compatible with existing 1.1.1 manifests and commands.
- No credentials may be written to repository files, summaries, telemetry or artifacts.
- `persistent`, `snapshot` and `ephemeral` workspace strategies are supported.
- Demo account preparation and fixture seeding must be idempotent.
- Destructive reset is allowed only for a workspace explicitly marked as demo by the consumer adapter.
- Existing web/Electron capture and demo duration normalization must remain unchanged.
- Release public module version as `1.2.0` only after full regression verification.

---

### Task 1: Demo profile manifest contract and adapter loading

**Files:**
- Create: `modules/artisys-qa/src/adapters.js`
- Modify: `modules/artisys-qa/src/manifest.js`
- Modify: `modules/artisys-qa/src/index.js`
- Test: `modules/artisys-qa/tests/demo-profile.test.js`

**Interfaces:**
- Produces: `resolveDemoProfile(manifest, requested, rootDir)`.
- Produces: `loadDemoAdapter(adapterPath)` and `validateDemoAdapter(adapter)`.
- Adapter hooks are optional except those required by the configured lifecycle path.

- [ ] **Step 1: Write failing manifest/profile tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQaManifest, resolveDemoProfile } from '../src/manifest.js';

test('1.1.1 manifest remains valid without demoProfile', () => {
  assert.equal(validateQaManifest({
    schemaVersion: 1,
    systemId: 'legacy',
    mode: 'web',
    environments: { ci: { baseURL: 'https://example.test' } },
    flows: { smoke: 'smoke.json' },
  }), true);
});

test('resolves named demo profile with adapter relative to manifest', () => {
  const manifest = {
    demoProfiles: {
      default: {
        adapter: './adapter.mjs',
        account: { createIfMissing: true, usernameEnv: 'DEMO_USER', passwordEnv: 'DEMO_PASS' },
        workspace: { strategy: 'persistent', resetBeforeRun: 'baseline' },
        fixtures: ['common/base'],
      },
    },
    defaultDemoProfile: 'default',
  };
  const profile = resolveDemoProfile(manifest, undefined, '/tmp/qa');
  assert.equal(profile.name, 'default');
  assert.equal(profile.adapterPath, '/tmp/qa/adapter.mjs');
  assert.equal(profile.workspace.strategy, 'persistent');
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `cd modules/artisys-qa && node --test tests/demo-profile.test.js`

Expected: FAIL because `resolveDemoProfile` and adapter loader do not exist.

- [ ] **Step 3: Implement profile validation/resolution and adapter loader**

`resolveDemoProfile` must return `null` when no profile is configured/requested, preserving legacy behavior. Validate strategy against `persistent|snapshot|ephemeral`, require environment variable names rather than literal credential values, and resolve `adapter` against `rootDir`.

`loadDemoAdapter` imports the resolved module URL and accepts either `default` export or named `adapter` export. `validateDemoAdapter` rejects non-object adapters and non-function hook values.

- [ ] **Step 4: Run focused tests and full manifest regression**

Run:

```bash
cd modules/artisys-qa
node --test tests/demo-profile.test.js tests/manifest.test.js
npm run check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add modules/artisys-qa/src/adapters.js modules/artisys-qa/src/manifest.js modules/artisys-qa/src/index.js modules/artisys-qa/tests/demo-profile.test.js
git commit -m "feat(qa): add demo profile and adapter contract"
```

---

### Task 2: Secure demo account/workspace lifecycle

**Files:**
- Create: `modules/artisys-qa/src/demo-profile.js`
- Create: `modules/artisys-qa/src/redaction.js`
- Modify: `modules/artisys-qa/src/index.js`
- Test: `modules/artisys-qa/tests/demo-profile-lifecycle.test.js`
- Test: `modules/artisys-qa/tests/redaction.test.js`

**Interfaces:**
- Produces: `prepareDemoProfile({ profile, adapter, env, context })`.
- Produces: `resetDemoProfile({ profile, adapter, env, context })`.
- Produces: `getDemoProfileStatus({ profile, adapter, env, context })`.
- Produces: `redactSecrets(value, secretValues)`.

- [ ] **Step 1: Write failing idempotency and redaction tests**

```js
test('prepare creates account once and reuses it', async () => {
  let exists = false;
  let creates = 0;
  const adapter = {
    findDemoAccount: async () => exists ? { id: 'demo-1', demo: true } : null,
    createDemoAccount: async () => { creates += 1; exists = true; return { id: 'demo-1', demo: true }; },
    authenticateDemoAccount: async () => ({ ok: true }),
    ensureDemoWorkspace: async () => ({ id: 'ws-1', demo: true }),
  };
  await prepareDemoProfile({ profile, adapter, env: { DEMO_USER: 'demo', DEMO_PASS: 'secret' }, context: {} });
  await prepareDemoProfile({ profile, adapter, env: { DEMO_USER: 'demo', DEMO_PASS: 'secret' }, context: {} });
  assert.equal(creates, 1);
});

test('redaction removes configured secret values recursively', () => {
  const value = { token: 'abc', nested: ['ok', 'abc'] };
  assert.deepEqual(redactSecrets(value, ['abc']), { token: '[REDACTED]', nested: ['ok', '[REDACTED]'] });
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/demo-profile-lifecycle.test.js tests/redaction.test.js`

Expected: FAIL because lifecycle/redaction modules do not exist.

- [ ] **Step 3: Implement lifecycle**

Lifecycle order: resolve secret values from declared env names → `findDemoAccount` → conditional `createDemoAccount` → `authenticateDemoAccount` → `ensureDemoWorkspace` → optional reset. Return only sanitized metadata (`profile`, `accountCreated`, demo account/workspace ids if adapter marks them non-sensitive).

Before calling `resetDemoWorkspace`, require workspace result `{ demo: true }`; otherwise throw `Refusing destructive reset outside an explicitly marked demo workspace`.

- [ ] **Step 4: Implement recursive redaction**

Redact exact secret strings from strings, arrays and object values. Do not mutate caller input.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS with legacy tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa/src/demo-profile.js modules/artisys-qa/src/redaction.js modules/artisys-qa/src/index.js modules/artisys-qa/tests/demo-profile-lifecycle.test.js modules/artisys-qa/tests/redaction.test.js
git commit -m "feat(qa): add secure demo profile lifecycle"
```

---

### Task 3: Reusable fixture registry with revisions

**Files:**
- Create: `modules/artisys-qa/src/fixture-registry.js`
- Create: `modules/artisys-qa/src/fixtures/common.js`
- Create: `modules/artisys-qa/src/fixtures/commerce.js`
- Modify: `modules/artisys-qa/src/index.js`
- Test: `modules/artisys-qa/tests/fixture-registry.test.js`

**Interfaces:**
- Produces: `createFixtureRegistry(packs = [])`.
- Produces: `resolveFixturePacks(registry, ids)`.
- Built-ins: `common/base`, `common/customer`, `common/employee`, `commerce/catalog`, `commerce/order`.
- Adapter materialization remains `seedDemoFixtures(context, packs)`.

- [ ] **Step 1: Write failing fixture tests**

```js
test('resolves fixture packs in requested order and deduplicates by id+revision', () => {
  const registry = createFixtureRegistry([
    { id: 'common/base', revision: 1, data: { locale: 'pt-BR' } },
    { id: 'commerce/catalog', revision: 1, data: { products: [] } },
  ]);
  const packs = resolveFixturePacks(registry, ['common/base', 'common/base', 'commerce/catalog']);
  assert.deepEqual(packs.map(p => `${p.id}@${p.revision}`), ['common/base@1', 'commerce/catalog@1']);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/fixture-registry.test.js`

Expected: FAIL because registry functions do not exist.

- [ ] **Step 3: Implement registry and built-in deterministic data**

Pack shape:

```js
{ id: 'common/customer', revision: 1, data: { customers: [{ externalKey: 'demo-customer-1', name: 'Cliente Demonstração' }] } }
```

The shared module provides deterministic sample payloads; the consumer adapter decides how those map to its schema.

- [ ] **Step 4: Wire fixture seeding into `prepareDemoProfile`**

After workspace reset/ensure, resolve built-in + adapter-provided packs and call `adapter.seedDemoFixtures(context, packs)` once per prepare. Pass revisions so the adapter can skip already-applied fixture revisions.

- [ ] **Step 5: Run lifecycle + registry + full tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa/src/fixture-registry.js modules/artisys-qa/src/fixtures modules/artisys-qa/src/demo-profile.js modules/artisys-qa/src/index.js modules/artisys-qa/tests/fixture-registry.test.js
git commit -m "feat(qa): add reusable demo fixture registry"
```

---

### Task 4: Flow composition and adapter capabilities

**Files:**
- Create: `modules/artisys-qa/src/flow-library.js`
- Create: `modules/artisys-qa/flows/common/login.json`
- Create: `modules/artisys-qa/flows/common/logout.json`
- Create: `modules/artisys-qa/flows/common/dashboard-tour.json`
- Create: `modules/artisys-qa/flows/common/create-record.json`
- Create: `modules/artisys-qa/flows/common/search-record.json`
- Create: `modules/artisys-qa/flows/common/report-tour.json`
- Modify: `modules/artisys-qa/src/steps.js`
- Modify: `modules/artisys-qa/src/runner.js`
- Modify: `modules/artisys-qa/package.json`
- Test: `modules/artisys-qa/tests/flow-library.test.js`
- Test: `modules/artisys-qa/tests/steps.test.js`

**Interfaces:**
- Produces: `resolveFlowComposition(flow, { rootDir, libraryRoot })`.
- `uses` may reference `common/login` or a relative JSON file.
- New step action `capability` calls `adapter.capabilities[name]({ page, step, context })`.

- [ ] **Step 1: Write failing composition tests**

```js
test('expands reusable uses entries in order', async () => {
  const flow = { steps: [{ uses: 'common/login' }, { action: 'screenshot', name: 'done' }] };
  const resolved = await resolveFlowComposition(flow, { libraryRoot: fixtureLibrary });
  assert.equal(resolved.steps.at(-1).action, 'screenshot');
  assert.ok(resolved.steps.some(step => step.action === 'capability' && step.name === 'auth.login'));
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/flow-library.test.js`

Expected: FAIL.

- [ ] **Step 3: Implement composition with cycle protection**

Track included identifiers and throw on recursive cycles. Resolve relative includes against the including file. Built-in library IDs resolve under `flows/common`.

- [ ] **Step 4: Add `capability` step execution**

Extend `executeStep` args with `adapter` and `runtimeContext`. For `action: 'capability'`, require `adapter.capabilities[step.name]` and invoke it. Preserve every existing selector-based action unchanged.

- [ ] **Step 5: Load composed flow in runner**

Replace direct `loadFlow(flowFile)` result with `resolveFlowComposition`. Pass adapter/runtime context through execution.

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
node --test tests/flow-library.test.js tests/steps.test.js
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add modules/artisys-qa/src/flow-library.js modules/artisys-qa/flows modules/artisys-qa/src/steps.js modules/artisys-qa/src/runner.js modules/artisys-qa/package.json modules/artisys-qa/tests/flow-library.test.js modules/artisys-qa/tests/steps.test.js
git commit -m "feat(qa): add reusable flow composition and capabilities"
```

---

### Task 5: Integrate demo profile into QA, Demo and CLI commands

**Files:**
- Modify: `modules/artisys-qa/src/runner.js`
- Modify: `modules/artisys-qa/src/demo.js`
- Modify: `modules/artisys-qa/src/cli.mjs`
- Modify: `modules/artisys-qa/src/index.js`
- Test: `modules/artisys-qa/tests/cli-profile.test.js`
- Test: `modules/artisys-qa/tests/demo-profile-integration.test.js`

**Interfaces:**
- `runQaFlow(..., profileContext = null)` and `runDemoFlow(..., profileContext = null)` accept prepared profile state.
- CLI adds `--profile` to `run` and `demo`.
- CLI adds `demo-profile prepare|reset|status --config ... [--profile default]`.

- [ ] **Step 1: Write failing CLI/integration tests**

Test `demo-profile prepare` with a fixture adapter that counts account creation, and test two consecutive prepares produce `accountCreated: true` then `false`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/cli-profile.test.js tests/demo-profile-integration.test.js`

Expected: FAIL because commands/profile integration are absent.

- [ ] **Step 3: Implement CLI dispatch**

Parse `demo-profile` as command and first positional argument as operation. Resolve profile and adapter before lifecycle action. For normal `run`/`demo`, profile remains optional; when present, prepare it before launching the target.

- [ ] **Step 4: Sanitize summaries**

Add only non-sensitive `demoProfile` metadata to `run-summary.json` and `demo-summary.json`: profile name, strategy, fixture ids/revisions and whether an account was created. Run the summary through `redactSecrets` before writing.

- [ ] **Step 5: Run full regression**

Run:

```bash
npm test
npm run check
npm run test:example
```

Expected: PASS and existing commands still work without profiles.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa/src/runner.js modules/artisys-qa/src/demo.js modules/artisys-qa/src/cli.mjs modules/artisys-qa/src/index.js modules/artisys-qa/tests/cli-profile.test.js modules/artisys-qa/tests/demo-profile-integration.test.js
git commit -m "feat(qa): integrate demo profiles into runners and CLI"
```

---

### Task 6: Templates, documentation and package metadata for 1.2.0

**Files:**
- Create: `modules/artisys-qa/templates/consumer/demo-adapter.mjs`
- Create: `modules/artisys-qa/templates/consumer/fixtures/product-demo.mjs`
- Modify: `modules/artisys-qa/templates/consumer/artisys-qa.config.json`
- Modify: `modules/artisys-qa/README.md`
- Modify: `modules/artisys-qa/module.json`
- Modify: `modules/artisys-qa/package.json`
- Modify: `modules/artisys-qa/package-lock.json`
- Test: `modules/artisys-qa/tests/reference.test.js`

**Interfaces:**
- Public package exports include `./demo-profile`, `./adapters`, `./fixture-registry`, `./flow-library`.
- Version becomes `1.2.0` only after previous tasks are green.

- [ ] **Step 1: Add a consumer adapter template**

Template exports deterministic hooks and comments clearly that real credentials come from `process.env` and product data writes must be scoped to a demo workspace.

- [ ] **Step 2: Extend template config with an optional `demoProfiles.default` example**

Keep the example disabled/comment-free JSON by placing it in a separate `artisys-qa.demo-profile.example.json` if adding it to the main template would force profile usage for legacy consumers.

- [ ] **Step 3: Update README and `module.json`**

Document account lifecycle, persistence strategies, fixture contract, capability flows, CLI commands and security boundaries. Remove the old limitation stating consumers fully own accounts/test data; replace it with the adapter-boundary explanation.

- [ ] **Step 4: Bump package/module/lock version to 1.2.0**

Run `npm install --package-lock-only --ignore-scripts` from `modules/artisys-qa` to update lock metadata consistently.

- [ ] **Step 5: Run package/reference checks**

Run:

```bash
npm test
npm run check
npm run test:example
npm pack --dry-run
```

Expected: PASS; package contains flows/templates/new source modules and no secrets.

- [ ] **Step 6: Commit**

```bash
git add modules/artisys-qa
 git commit -m "release(qa): prepare 1.2.0 demo platform"
```

---

### Task 7: Final regression and integration evidence

**Files:**
- Test only unless regressions require targeted fixes.

**Interfaces:**
- Proves legacy 1.1.1 use, new profile lifecycle, web reference capture and existing media normalization all coexist.

- [ ] **Step 1: Run the entire module suite fresh**

```bash
cd modules/artisys-qa
npm test
npm run check
npm run test:example
```

Expected: zero failures.

- [ ] **Step 2: Run explicit secret-leak scan on generated fixtures/artifacts**

Use a known fake secret such as `ARTISYS_TEST_SECRET_9f4c` in the reference adapter, run prepare/demo integration, then:

```bash
! grep -R "ARTISYS_TEST_SECRET_9f4c" qa-artifacts
```

Expected: exit 0 (secret absent).

- [ ] **Step 3: Verify backward compatibility against the current consumer template**

```bash
node ./src/cli.mjs validate --config ./templates/consumer/artisys-qa.config.json
```

Expected: `valid <systemId> (<mode>)`.

- [ ] **Step 4: Review diff against `main`**

Confirm no unrelated repository changes and no product-specific PDV/Obra selectors or credentials entered the central module.

- [ ] **Step 5: Push PR for review/merge**

Create a PR from `feat/artisys-qa-demo-platform-1.2` to `main` with test evidence. Do not merge until all CI checks pass.

---

## Downstream rollout after 1.2.0 is merged

Treat consumer adoption as separate small changes so central-module risk and product-specific risk remain isolated:

1. **PDV:** update the pinned QA version/commit, add its demo adapter, persistent/snapshot demo profile, `pdv/salon` fixtures and flows, then regenerate installer.
2. **Obra na Mão Comercial:** update the pin, add shared profile adapter usable by web/Electron, add `obra/project` fixtures/flows, then regenerate installer and redeploy web as applicable.
3. Other products adopt the same adapter contract without changing the central module.

A consumer pinned to an older tag/commit/runtime does **not** receive central changes automatically. Upgrade is explicit and auditable by design.
