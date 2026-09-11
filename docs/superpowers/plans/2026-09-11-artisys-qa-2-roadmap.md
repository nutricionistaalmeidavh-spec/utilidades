# ArtiSys QA 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve `modules/artisys-qa` into a reusable QA product with quick/full/release profiles, desktop/release checks, network/concurrency helpers, reusable business packs, unified reports/history, release gates, and a richer optional Remote Control.

**Architecture:** Keep `runQaFlow` as the single flow executor. Add orchestration around it instead of duplicating Playwright logic. New subsystems expose small pure interfaces and remain optional; GitHub Actions is untouched and the core remains self-hosted/free.

**Tech Stack:** Node.js >=22, Playwright peer dependency, Node built-ins for process/network/reporting/HTTP.

**Spec:** Approved roadmap in chat on 2026-09-11.

## Global Constraints

- Core must remain R$0 / self-hosted / open source.
- GitHub Actions remains an independent optional execution path.
- Visual regression remains opt-in.
- No remote arbitrary shell command execution.
- Remote access is LAN-first and token-authenticated.
- Existing manifest schemaVersion 1 consumers must keep working.
- Release profile fails closed on critical checks unless explicit override is supplied.

---

### Task 1: QA execution profiles
- [ ] Add `quick`, `full`, and `release` profile resolution.
- [ ] Add profile orchestration over existing flows without changing `runQaFlow` semantics.
- [ ] Add tests for defaults, manifest overrides, and fail-closed behavior.

### Task 2: Desktop and release checks
- [ ] Add process/desktop executable smoke checks using Node built-ins.
- [ ] Support launch, startup grace, premature-exit detection, clean shutdown, and optional persistence callback.
- [ ] Keep installer-specific behavior adapter-driven rather than hard-coding NSIS/MSI.

### Task 3: Network/concurrency kit
- [ ] Formalize isolated terminal concurrency helpers.
- [ ] Add retry/recovery helper for transient network failures.
- [ ] Add deterministic tests without external SaaS.

### Task 4: Business packs
- [ ] Add reusable pack metadata for auth, commerce, finance, and workforce.
- [ ] Resolve pack-required flow names against a consumer manifest.
- [ ] Fail clearly when a required flow is missing.

### Task 5: Unified reports and history
- [ ] Aggregate run summaries into one JSON report.
- [ ] Generate a dependency-free HTML report.
- [ ] Store/read bounded local history under the selected output root.

### Task 6: Release gate
- [ ] Evaluate critical profile results and return explicit pass/fail gate state.
- [ ] Support explicit override with auditable reason.
- [ ] Expose a stable JSON contract consumable by the existing release-validator.

### Task 7: Remote Control 2.0
- [ ] Add profile selection (`quick/full/release`) while keeping flow-level execution available.
- [ ] Surface last result/history summary.
- [ ] Keep one-run lock, token auth, manifest/profile whitelists, and no arbitrary commands.

### Task 8: CLI, exports, docs, version
- [ ] Add `quick`, `full`, `release` CLI commands.
- [ ] Export new APIs.
- [ ] Update package/module metadata and README.
- [ ] Add/extend unit tests and run the full module test suite where execution is available.
