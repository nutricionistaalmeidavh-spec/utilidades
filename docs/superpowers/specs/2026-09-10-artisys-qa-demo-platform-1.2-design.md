# ArtiSys QA 1.2.0 — Demo Platform Design

## Goal

Evolve `@artisys/qa` from a capture/flow runner into a reusable demo platform that can prepare a safe demo identity, maintain or recreate a stable demo workspace, load reusable fixtures, run predefined or custom process flows, and capture the result in web or Electron consumers.

The design must remain backward-compatible with 1.1.1 consumers.

## Chosen approach

Use an **adapter-driven orchestration layer** in `@artisys/qa`.

The QA module owns lifecycle, configuration, reusable flow composition, fixture orchestration, state metadata and evidence capture. Each product owns only the domain-specific adapter: how to find/create/authenticate the demo account, how to prepare its demo workspace, and how named capabilities map to the product.

This is preferred over:

1. **Hardcoded product logic in the QA module** — fastest initially, but couples PDV/Obra/FluxoDRE behavior to the shared module.
2. **Only consumer-owned scripts** — flexible, but repeats account setup, fixtures and flow logic in every repository.
3. **Adapter-driven orchestration** — selected because it centralizes reusable behavior while keeping product rules isolated.

## Demo profile contract

A consumer may add a `demoProfile` section to its QA manifest/config.

Conceptual shape:

```json
{
  "demoProfile": {
    "id": "default",
    "adapter": "./adapter.mjs",
    "account": {
      "createIfMissing": true,
      "usernameEnv": "ARTISYS_DEMO_USERNAME",
      "passwordEnv": "ARTISYS_DEMO_PASSWORD"
    },
    "workspace": {
      "strategy": "persistent",
      "resetBeforeRun": "baseline"
    },
    "fixtures": ["common/base"]
  }
}
```

The section is optional. Existing 1.1.1 manifests continue to run unchanged.

## Account lifecycle

`@artisys/qa` orchestrates these adapter hooks:

- `findDemoAccount(context)`
- `createDemoAccount(context)`
- `authenticateDemoAccount(context)`
- `ensureDemoWorkspace(context)`
- `resetDemoWorkspace(context, policy)`
- `seedDemoFixtures(context, fixtures)`

Behavior is idempotent:

1. Resolve credentials only from environment variables or an external secret provider.
2. Ask the adapter whether the demo identity already exists.
3. Create it only when absent and `createIfMissing` is enabled.
4. Authenticate the same identity on later runs.
5. Prepare/reset/seed its workspace before the requested flow.

Credentials are never persisted in repository files, run summaries, telemetry or artifacts.

## Persistence strategies

The module exposes three workspace strategies:

- `persistent`: preferred for web/staging systems. The account/workspace remains in the product backend between recordings.
- `snapshot`: for local/Electron products. The consumer adapter exports/imports a demo-data snapshot; GitHub Actions may restore/save it using a consumer workflow cache or artifact.
- `ephemeral`: creates a deterministic disposable workspace each run.

The module stores only non-sensitive state metadata such as profile id, fixture revision and last baseline revision.

## Fixtures

Add a reusable fixture registry.

Two layers:

- **Core fixture packs** shipped by the module for generic concepts and sample data.
- **Product fixture packs** supplied by consumer adapters for domain-specific entities.

Fixture execution is deterministic and idempotent. A fixture pack declares an id and revision; the adapter decides how to materialize the data.

Initial reusable categories:

- `common/base`
- `common/customer`
- `common/employee`
- `commerce/catalog`
- `commerce/order`

Product-specific packs such as `pdv/salon` and `obra/project` remain in the consumer repository but use the same registry contract.

## Reusable process flows

Keep current JSON flows and Demo Flows, and add composition plus named capabilities.

New flow primitives:

- `uses`: include another reusable flow or subflow.
- `capability`: invoke a named adapter capability instead of hardcoding a selector.

Example:

```json
{
  "steps": [
    {"action": "capability", "name": "auth.login"},
    {"action": "capability", "name": "navigation.dashboard"},
    {"uses": "flows/common/show-dashboard.json"}
  ]
}
```

This allows a flow such as login/dashboard tour to be reused by multiple systems while each system maps the capability to its own selectors/actions.

Custom selector-based steps remain fully supported.

## Flow library

Ship a small built-in library focused on genuinely reusable processes rather than product-specific assumptions:

- `common/login`
- `common/logout`
- `common/dashboard-tour`
- `common/create-record`
- `common/search-record`
- `common/report-tour`

Domain-heavy flows such as `pdv/salon` or `obra/apontamento` belong to consumer repositories but can compose the common flows.

## Runtime sequence

For a demo-enabled run:

1. Load and validate manifest.
2. Resolve demo profile.
3. Load consumer adapter.
4. Prepare demo account.
5. Prepare/reset workspace.
6. Seed requested fixture packs.
7. Resolve predefined/custom flow composition.
8. Launch web or Electron target.
9. Execute flow and capture evidence/video.
10. Emit sanitized demo summary.
11. Optionally save non-sensitive snapshot/state metadata.

If profile preparation fails, capture stops before product actions begin.

## CLI

Extend the CLI without breaking existing commands.

Planned commands/options:

```text
artisys-qa demo-profile prepare --config ...
artisys-qa demo-profile reset --config ...
artisys-qa demo-profile status --config ...
artisys-qa demo --config ... --demo ... --profile default
artisys-qa qa --config ... --flow ... --profile default
```

The current `demo`, `qa`, `list` and existing flags remain valid.

## Security boundaries

- No passwords/tokens in manifests or fixture files.
- Sensitive values are read from environment variables at runtime.
- Summaries redact configured secret keys and adapter-returned secret fields.
- Persistent demo accounts must be isolated from production customer data by the consumer adapter/environment.
- A reset policy must be scoped to the resolved demo workspace only.
- Destructive reset hooks require an explicit demo-profile marker supplied by the adapter.

## Files/components

Expected central additions:

- `src/demo-profile.js` — lifecycle orchestration.
- `src/adapters.js` — adapter validation/loading.
- `src/fixture-registry.js` — fixture packs and revisions.
- `src/flow-library.js` — reusable flow resolution/composition.
- updates to `manifest.js`, `steps.js`, `runner.js`, `demo.js`, `cli.mjs`, `index.js`.
- templates for adapter/profile/fixture examples.
- dedicated tests for lifecycle, redaction, fixtures and flow composition.

## Testing strategy

TDD for each capability:

1. Add failing contract/unit test.
2. Implement minimal behavior.
3. Run module unit + manifest checks.
4. Run browser reference test.
5. Add one reference adapter integration test covering prepare → seed → flow → sanitized summary.

Regression requirements:

- all 1.1.1 manifests continue to validate and run;
- existing Demo Flow video duration normalization remains unchanged;
- secrets never appear in emitted JSON artifacts;
- repeated `prepare` calls do not create duplicate accounts/fixtures.

## Versioning and rollout

Release as **`@artisys/qa 1.2.0`** because this adds new public configuration, CLI commands and adapter interfaces while preserving existing behavior.

Rollout order after the central module is green:

1. PDV — reusable persistent demo account plus `pdv/salon` fixture/flow.
2. Obra na Mão Comercial — shared profile system for web/Electron and `obra/project` fixtures.
3. Other ArtiSys products adopt the same adapter contract as needed.

## Success criteria

The feature is complete when a consumer can configure one demo profile and then repeatedly run a predefined or custom flow without manually recreating login/data, while producing the same QA/video artifacts as today and without exposing credentials or touching non-demo data.
