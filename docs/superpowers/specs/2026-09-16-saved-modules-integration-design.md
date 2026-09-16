# Saved Modules Integration Design — 2026-09-16

## Goal

Give every newly saved upstream a formal place in `utilidades` without prematurely treating references as production dependencies. This batch covers 57 saved repositories and maps them to 36 ArtiSys module targets, of which `artisys-pdf` and `artisys-security` already exist and receive extension roadmaps.

## Scope

This design implements deliveries 1–4 only:

1. register newly saved upstreams;
2. map each upstream to an existing or planned ArtiSys module;
3. define an individual development roadmap for every target module;
4. review licensing risk and approve an integration boundary.

It does **not** implement the modules, alter CI, install Woodpecker, or change `artisys-release` yet.

## Architecture

```text
saved upstream
      ↓
catalog/saved-repos-2026-09-16.json
      ↓
planned/existing module target
      ↓
catalog/planned-modules-2026-09-16.json
      ↓
module implementation in a later delivery
      ↓
consumer product
```

The existing canonical `catalog/modules.json` remains reserved for modules that actually have a `modules/<id>` implementation, manifest and verification path. Planned modules therefore live in a separate catalog until implementation begins. This prevents `scripts/check-modules.py` from reporting nonexistent modules as reusable-ready.

## Integration boundaries

- `embedded`: permissive library/component may execute inside the product after normal notice/attribution handling.
- `adapter`: ArtiSys owns the stable contract and talks to an upstream library/process through a narrow adapter.
- `service`: the upstream remains an optional external/self-hosted process or application. It is never a silent runtime dependency of the ArtiSys core.
- `dev-tool`: development/QA/release tooling only; never customer runtime.

For mixed or copyleft upstreams, the default is the stricter boundary.

## Licensing policy

- MIT/BSD/Apache: permissive; adapter/embedded use is possible while preserving notices.
- MPL/EPL/LGPL: keep an explicit technical/license boundary and preserve the corresponding obligations.
- GPL/AGPL: do not vendor into proprietary ArtiSys core. Use service/process/firmware adapters or reimplement the domain contract clean-room.
- Mixed/source-available/restricted repositories: audit by path/component before reuse. A permissive root license does not override a differently licensed component.
- Models, firmware blobs and optional third-party assets require their own license review.

This is an engineering policy, not legal advice.

## Module design rule

Every planned module must expose an ArtiSys-owned contract so consumers do not import upstream-specific APIs across business logic. A module is considered integration-ready only when it has:

1. a documented stable contract;
2. automated tests using fixtures/mocks;
3. an executable example with no required paid service;
4. documented license/runtime boundaries.

## Relationship with CI/release

The roadmap deliberately leaves CI execution for the next stage. When implementation reaches the release work, the existing `artisys-release`, `artisys-qa`, `artisys-security` and `artisys-release-validator` will remain the shared logic. GitHub Actions, CircleCI, local PowerShell/CLI, `act` and Woodpecker should be executors of that common pipeline rather than independent implementations.

## Canonical files

- `catalog/saved-repos-2026-09-16.json`: upstream inventory, target module, license risk and integration mode.
- `catalog/planned-modules-2026-09-16.json`: planned module registry and definition-of-ready.
- `docs/superpowers/plans/2026-09-16-saved-modules-roadmap.md`: per-module development roadmap.
- `docs/UPSTREAM_LICENSE_REVIEW_2026-09-16.md`: human-readable license/integration review.
