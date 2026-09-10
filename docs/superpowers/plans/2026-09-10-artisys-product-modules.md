# ArtiSys Product Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six reusable, serverless/local ArtiSys kits: capture, dashboard, planning, media, office and UI builder.

**Architecture:** Each module owns a portable ArtiSys contract plus small adapters to approved upstreams. Consumers keep product business rules, persistence, permissions and visual styling. No module may require an always-on service or paid API.

**Tech Stack:** Node.js >=22, ESM, node:test, approved upstream boundaries already cataloged in `projects/`.

**Spec:** `docs/SELECTION_POLICY.md`

## Global Constraints

- No server, daemon, VPS, dedicated PC or self-hosted runner permanently running.
- Core license/subscription cost R$0.
- Upstream-specific state must not leak into product domain contracts.
- New modules must include `module.json`, package metadata, README, executable source, tests and example.
- Product integration is explicitly out of scope.

---

### Task 1: ArtiSys Capture

**Files:** `modules/artisys-capture/{src/index.mjs,tests/index.test.mjs,examples/basic.mjs,package.json,module.json,README.md,LICENSE}`

**Interfaces:** Produces portable capture requests/results, html5-qrcode file-scanner adapter, and OpenCV grayscale/threshold helpers.

- [ ] Write failing tests for request/result validation and runtime adapters.
- [ ] Run module test and confirm failure because implementation is absent.
- [ ] Implement minimal contract and adapters.
- [ ] Run tests and example.

### Task 2: ArtiSys Dashboard

**Files:** `modules/artisys-dashboard/{src/index.mjs,tests/index.test.mjs,examples/basic.mjs,package.json,module.json,README.md,LICENSE}`

**Interfaces:** Produces portable dashboard layout and adapters for react-grid-layout, react-resizable-panels and Glide Data Grid.

- [ ] Write failing tests for layout validation and adapter outputs.
- [ ] Verify red.
- [ ] Implement minimal portable dashboard contract and adapters.
- [ ] Verify green.

### Task 3: ArtiSys Planning

**Files:** `modules/artisys-planning/{src/index.mjs,tests/index.test.mjs,examples/basic.mjs,package.json,module.json,README.md,LICENSE}`

**Interfaces:** Produces portable plan validation, Frappe Gantt and FullCalendar adapters, progress calculation and resource-overlap detection.

- [ ] Write failing tests for dates, dependencies, adapters and conflicts.
- [ ] Verify red.
- [ ] Implement minimal planning engine.
- [ ] Verify green.

### Task 4: ArtiSys Media

**Files:** `modules/artisys-media/{src/index.mjs,tests/index.test.mjs,examples/basic.mjs,package.json,module.json,README.md,LICENSE}`

**Interfaces:** Produces a normalized media-job contract, deterministic timeline utilities, MediaBunny runtime boundary and Motion Canvas scene manifest adapter.

- [ ] Write failing tests for job validation, timeline slicing and adapter boundaries.
- [ ] Verify red.
- [ ] Implement minimal media contract and adapters.
- [ ] Verify green.

### Task 5: ArtiSys Office

**Files:** `modules/artisys-office/{src/index.mjs,tests/index.test.mjs,examples/basic.mjs,package.json,module.json,README.md,LICENSE}`

**Interfaces:** Produces portable office-document descriptors, docxjs render adapter, Univer workbook/document descriptors and PPT Master command plans.

- [ ] Write failing tests for descriptors and adapters.
- [ ] Verify red.
- [ ] Implement minimal office boundary.
- [ ] Verify green.

### Task 6: ArtiSys UI Builder

**Files:** `modules/artisys-ui-builder/{src/index.mjs,tests/index.test.mjs,examples/basic.mjs,package.json,module.json,README.md,LICENSE}`

**Interfaces:** Produces a portable page/block schema plus GrapesJS, Puck and Craft.js adapter models.

- [ ] Write failing tests for page validation and round-trip-safe adapter payloads.
- [ ] Verify red.
- [ ] Implement portable page model and adapters.
- [ ] Verify green.

### Task 7: Catalog and central verification

**Files:** Modify `catalog/modules.json`, `modules/README.md`, `README.md`, `scripts/check-modules.py`, `.github/workflows/module-checks.yml`.

**Interfaces:** Central checker must validate and execute all six new module suites.

- [ ] Register each module as `stable` only after its own suite is green.
- [ ] Add dependency installation and central test execution.
- [ ] Run the GitHub Actions module-check workflow.
- [ ] Merge only after CI succeeds.
