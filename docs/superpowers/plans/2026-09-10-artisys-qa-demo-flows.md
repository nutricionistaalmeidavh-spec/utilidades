# ArtiSys QA Demo Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable demo-flow video generation to `artisys-qa`, including Reels 9:16, and make PDV ArtiSys the first real consumer.

**Architecture:** Keep test flows and demo flows separate. Extend manifest resolution with demo presets and pacing, reuse the current Playwright/Electron runner for launch/telemetry, and add deterministic video normalization for social output. PDV declares only product-specific demo flows.

**Tech Stack:** Node.js 22+, Playwright 1.x, Electron consumer runtime, ffmpeg, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-10-artisys-qa-demo-flows-design.md`

## Global Constraints

- Existing QA/test flows remain backward compatible.
- Demo output supports `landscape-16x9`, `square-1x1`, and `reels-9x16`.
- Reels output is 1080x1920 MP4.
- Demo timing targets are advisory, never pass/fail gates.
- Consumer owns selectors, credentials and product-specific order.
- No music, narration, captions or editorial motion in this version.

---

### Task 1: Demo manifest contract and presets

**Files:**
- Modify: `modules/artisys-qa/src/config.js`
- Modify: `modules/artisys-qa/src/manifest.js`
- Test: `modules/artisys-qa/tests/manifest.test.js`

**Interfaces:**
- Produces: `DEMO_PRESETS`, `resolveDemo(manifest, requested, rootDir)`, `resolveDemoPreset(name)`.

- [ ] Add failing tests for preset dimensions, valid `demos` entries and unknown presets.
- [ ] Implement the three presets and demo resolver.
- [ ] Run `npm test` in the module.
- [ ] Commit.

### Task 2: Demo pacing and summaries

**Files:**
- Modify: `modules/artisys-qa/src/steps.js`
- Modify: `modules/artisys-qa/src/runner.js`
- Create: `modules/artisys-qa/src/demo.js`
- Test: `modules/artisys-qa/tests/demo.test.js`

**Interfaces:**
- Consumes: existing `executeStep` and `runQaFlow`.
- Produces: `runDemoFlow(options)` and `buildDemoSummary(...)`.

- [ ] Add tests for `holdMs`, target/actual duration and non-failing timing deviation.
- [ ] Apply `holdMs` after any step.
- [ ] Build `demo-summary.json` while preserving normal evidence.
- [ ] Run module tests.
- [ ] Commit.

### Task 3: Social video normalization

**Files:**
- Modify: `modules/artisys-qa/src/video.js`
- Modify: `modules/artisys-qa/src/runner.js`
- Test: `modules/artisys-qa/tests/demo.test.js`

**Interfaces:**
- Produces: `normalizeDemoVideo(input, output, preset)` preserving aspect ratio with scale/pad.

- [ ] Add tests for ffmpeg argument generation for 16:9, 1:1 and 9:16.
- [ ] Implement scale/pad composition and MP4 H.264/yuv420p output.
- [ ] Normalize both native web video and Electron frame video for demo runs.
- [ ] Run tests.
- [ ] Commit.

### Task 4: CLI, templates and documentation

**Files:**
- Modify: `modules/artisys-qa/src/cli.mjs`
- Modify: `modules/artisys-qa/src/index.js`
- Modify: `modules/artisys-qa/templates/consumer/artisys-qa.config.json`
- Create: `modules/artisys-qa/templates/consumer/demo/quick-30s.json`
- Modify: `modules/artisys-qa/README.md`
- Modify: `modules/artisys-qa/module.json`
- Modify: `catalog/modules.json`

**Interfaces:**
- Produces CLI: `artisys-qa demo --config ... --demo quick-30s --preset reels-9x16`.

- [ ] Expose demo APIs and CLI.
- [ ] Add drop-in template.
- [ ] Document social presets and evidence outputs.
- [ ] Promote module version to 1.1.0.
- [ ] Run `npm test`, `npm run check`, and browser reference test.
- [ ] Commit.

### Task 5: GitHub Actions demo execution

**Files:**
- Modify: `.github/actions/artisys-qa/action.yml`
- Modify: `.github/workflows/artisys-qa-reusable.yml`
- Modify: `.github/workflows/artisys-qa-ci.yml`

**Interfaces:**
- Adds reusable inputs `mode`, `demo`, and `preset` while preserving QA-run behavior.

- [ ] Add demo inputs with backward-compatible defaults.
- [ ] Route `mode=demo` to the demo CLI.
- [ ] Upload demo artifacts exactly like QA artifacts.
- [ ] Verify PR CI.
- [ ] Commit.

### Task 6: PDV consumer demo flows

**Files:**
- Modify: `PDV-ARTISYS/qa/artisys-qa.config.json`
- Create: `PDV-ARTISYS/qa/demo/quick-30s.json`
- Create: `PDV-ARTISYS/qa/demo/overview-60s.json`
- Modify: `PDV-ARTISYS/.github/workflows/qa-capture.yml`
- Modify: `PDV-ARTISYS/docs/operations/qa-visual.md`

**Interfaces:**
- Adds PDV demos `quick-30s` and `overview-60s`.

- [ ] Register demos in PDV manifest.
- [ ] Build non-destructive navigation flow through home, products, inventory, checkout, cash and reports.
- [ ] Add workflow inputs for demo mode/preset.
- [ ] Run structural verify and real GitHub Actions Electron capture.
- [ ] Confirm artifact contains 1080x1920 MP4 for Reels preset.
- [ ] Merge after green verification.
