# ArtiSys PDF + Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved PDF and visual-workflow upstreams into reusable, tested ArtiSys modules with stable contracts.

**Architecture:** Keep product business rules in consumers. `artisys-pdf` exposes generation/viewer/highlight adapters around pdfme, PDF.js and react-pdf-highlighter. `artisys-workflows` owns a portable graph contract, validation/execution utilities and adapters for XYFlow, LogicFlow and Rete.js. Upstreams remain optional peer dependencies where the core tests do not need their UI/runtime packages.

**Tech Stack:** Node.js >=22, ESM, node:test, pdfme/PDF.js/react-pdf-highlighter, XYFlow/LogicFlow/Rete.js.

**Spec:** User-approved request in project conversation on 2026-09-10.

## Global Constraints

- Core license/subscription cost must remain R$ 0.
- No always-on server, VPS, dedicated PC or self-hosted runner.
- Product-specific rules remain in consumer repositories.
- Upstream licenses and attribution boundaries remain explicit.
- Module verification must run in the existing GitHub Actions `module-checks` workflow.

---

### Task 1: ArtiSys PDF contract

**Files:** create `modules/artisys-pdf/**`.

**Produces:** template/input validation, pdfme generation adapter, PDF.js loader adapter, highlighter normalization, CLI, example, metadata and tests.

- [ ] Write node:test cases first for invalid templates, normalized inputs, highlight normalization and injected generator/viewer adapters.
- [ ] Run tests and confirm RED because implementation is absent.
- [ ] Implement the minimal ESM runtime and CLI.
- [ ] Run tests and confirm GREEN.
- [ ] Add README, module.json and MIT license.

### Task 2: ArtiSys Workflows contract

**Files:** create `modules/artisys-workflows/**`.

**Produces:** portable graph schema, validation, topological ordering, cycle detection, deterministic execution and XYFlow/LogicFlow/Rete adapters.

- [ ] Write node:test cases first for graph validation, ordering, cycles, execution and adapter conversion.
- [ ] Run tests and confirm RED because implementation is absent.
- [ ] Implement the minimal ESM runtime and CLI.
- [ ] Run tests and confirm GREEN.
- [ ] Add README, module.json and MIT license.

### Task 3: Repository integration

**Files:** modify `catalog/modules.json`, `scripts/check-modules.py`, `.github/workflows/module-checks.yml`, `modules/README.md`, `README.md`.

- [ ] Register both modules as stable 1.0.0 modules with implemented capability metadata.
- [ ] Add both to the ready-module verifier and npm test loop.
- [ ] Keep CI on GitHub-hosted `ubuntu-latest` only.
- [ ] Update module documentation and root counts.
- [ ] Open a PR and verify the module-check workflow before integration.
