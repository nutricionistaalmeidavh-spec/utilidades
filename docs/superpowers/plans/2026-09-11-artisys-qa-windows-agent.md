# ArtiSys QA Windows Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Windows local agent that starts at logon, supervises registered QA projects, and self-updates safely from the stable channel with rollback.

**Architecture:** Keep existing QA execution unchanged. Add a separate agent subsystem that manages local registry/state, launches existing `remote` CLI children, and updates through A/B slots behind a bootstrap pointer. Windows installation is performed by PowerShell + Task Scheduler.

**Tech Stack:** Node.js >=22, Git CLI, PowerShell 5.1+, Windows Task Scheduler, Node built-ins only.

**Spec:** `docs/superpowers/specs/2026-09-11-artisys-qa-windows-agent-design.md`

## Global Constraints

- Core remains R$0 / self-hosted / open source.
- No GitHub Actions dependency.
- No stored GitHub token; reuse existing Git authentication.
- Auto-update only when `stable-channel.json` version increases.
- Failed candidate validation never replaces the active slot.
- Existing QA commands remain backward compatible.
- Remote execution still accepts no arbitrary shell commands.

---

### Task 1: Agent registry and configuration
- [ ] Add local agent state path resolution.
- [ ] Add project register/unregister/list/autoupdate APIs.
- [ ] Validate absolute manifest paths, unique ids and unique ports.
- [ ] Add unit tests.

### Task 2: Agent supervisor
- [ ] Add long-running supervisor loop.
- [ ] Spawn existing `remote` CLI for each enabled registered project.
- [ ] Restart crashed children with bounded backoff.
- [ ] Stop all children cleanly on SIGINT/SIGTERM.
- [ ] Add deterministic unit tests around command construction/state transitions.

### Task 3: Stable updater
- [ ] Add semantic version comparison.
- [ ] Fetch `origin/main` using Git CLI.
- [ ] Read `stable-channel.json` from the fetched ref.
- [ ] Prepare inactive slot using Git clone/checkout.
- [ ] Install dependencies and run `npm test` + `npm run check` before activation.
- [ ] Switch active pointer only after successful validation.
- [ ] Keep previous slot for rollback.

### Task 4: Bootstrap and health rollback
- [ ] Add bootstrap script template outside versioned slots.
- [ ] Read active slot and start its agent.
- [ ] If candidate slot exits before health grace, restore previous slot and restart it.

### Task 5: PowerShell installer
- [ ] Validate Windows, Node >=22 and Git availability.
- [ ] Create `%LOCALAPPDATA%\ArtiSys\QA` directories.
- [ ] Clone stable source into slot A.
- [ ] Install dependencies and Chromium.
- [ ] Generate bootstrap/state files.
- [ ] Create Task Scheduler logon task.
- [ ] Start task immediately.
- [ ] Make install idempotent.

### Task 6: CLI integration
- [ ] Add `agent register|unregister|list|status|autoupdate|run`.
- [ ] Keep all existing CLI commands unchanged.
- [ ] Document installation and lifecycle.

### Task 7: Release metadata
- [ ] Add `stable-channel.json`.
- [ ] Bump package/module/catalog version.
- [ ] Extend exports/files metadata.
- [ ] Run available verification and open PR.
