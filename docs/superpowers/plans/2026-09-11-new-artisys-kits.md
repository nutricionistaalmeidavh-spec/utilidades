# New ArtiSys Kits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nine reusable ArtiSys kits without duplicating the existing serial/printing/capture POS hardware modules.

**Architecture:** Dependency-free Node 22 ESM contracts wrap optional upstream engines through injected adapters. Repository metadata and global verification remain the source of truth.

**Tech Stack:** Node.js 22 ESM, node:test, Node crypto Ed25519, Python repository verifier.

**Spec:** `docs/superpowers/specs/2026-09-11-new-artisys-kits-design.md`

## Global Constraints

- No mandatory paid service or always-on infrastructure.
- No product gains copyleft linkage merely because an upstream is cataloged.
- New modules begin at `implemented 0.1.0`.
- Every kit must pass unit, syntax, example, and package dry-run checks.

---

### Task 1: Video, document, backend, and support kits
- [x] Write failing contract tests.
- [x] Implement adapter-based contracts.
- [x] Verify tests and packaging.

### Task 2: Release and desktop shell kits
- [x] Write failing contract tests.
- [x] Implement release gates, hashing, shell manifest and action routing.
- [x] Verify tests and packaging.

### Task 3: OCR and product QA kits
- [x] Write failing contract tests.
- [x] Implement provider selection and QA aggregation.
- [x] Verify tests and packaging.

### Task 4: Licensing kit
- [x] Write failing signature, expiry and device-binding tests.
- [x] Implement Ed25519 signing and offline verification.
- [x] Verify tests and packaging.

### Task 5: Repository integration
- [x] Register all nine modules in `catalog/modules.json`.
- [x] Extend `scripts/check-modules.py` for incorporated upstream references and new JS kits.
- [x] Update module and kit documentation/counts.
- [x] Run diff review and merge only after verification.
