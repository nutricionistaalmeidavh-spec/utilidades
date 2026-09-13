# artisys-files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um módulo local-first reutilizável para workspaces de arquivos espelhados em uma pasta real do computador, com árvore, operações seguras, drag-and-drop, indexação e watcher.

**Architecture:** O módulo expõe contratos independentes de UI e uma implementação Node baseada em `node:fs/promises`. O workspace restringe toda operação ao root configurado e pode ser consumido por Electron/Tauri/Node; frontends renderizam Explorer e drag-and-drop a partir dos contratos.

**Tech Stack:** TypeScript, Node.js filesystem APIs, testes Node já adotados pelo repositório.

**Spec:** `docs/superpowers/specs/2026-09-13-artisys-files-design.md`

## Global Constraints

- Core R$ 0, self-hosted/local e open source.
- Sem servidor, daemon, banco dedicado ou serviço pago obrigatório.
- Não duplicar `artisys-storage`.
- UI independente do módulo.

---

### Task 1: Scaffold, contracts and safe path resolution

**Files:**
- Create: `modules/artisys-files/package.json`
- Create: `modules/artisys-files/tsconfig.json`
- Create: `modules/artisys-files/src/types.ts`
- Create: `modules/artisys-files/src/path-guard.ts`
- Create: `modules/artisys-files/src/index.ts`
- Test: `modules/artisys-files/test/path-guard.test.ts`

**Interfaces:**
- Produces: `WorkspaceEntry`, `WorkspaceTree`, `WorkspaceChange`, `WorkspaceOperation`; `resolveInsideRoot(root, relativePath)`.

- [ ] Write tests rejecting absolute paths and `..` traversal while accepting nested relative paths.
- [ ] Implement canonical contracts and `resolveInsideRoot` using `node:path`.
- [ ] Run module tests and typecheck.
- [ ] Commit.

### Task 2: Workspace filesystem operations and tree

**Files:**
- Create: `modules/artisys-files/src/workspace.ts`
- Test: `modules/artisys-files/test/workspace.test.ts`

**Interfaces:**
- Produces: `createWorkspace(root)`, `listTree`, `createDirectory`, `writeFile`, `rename`, `move`, `copy`, `remove`.

- [ ] Write tests for create/list/rename/move/copy/remove and nested tree output.
- [ ] Implement operations using `node:fs/promises` and the path guard.
- [ ] Run module tests and typecheck.
- [ ] Commit.

### Task 3: Drag-and-drop translation

**Files:**
- Create: `modules/artisys-files/src/drag-drop.ts`
- Test: `modules/artisys-files/test/drag-drop.test.ts`

**Interfaces:**
- Produces: `applyDrop(workspace, request)` with `move` and `copy` modes.

- [ ] Write tests that translate file/folder drops into safe workspace operations.
- [ ] Implement conflict-safe destination resolution.
- [ ] Run module tests and typecheck.
- [ ] Commit.

### Task 4: Index and search

**Files:**
- Create: `modules/artisys-files/src/indexer.ts`
- Test: `modules/artisys-files/test/indexer.test.ts`

**Interfaces:**
- Produces: `WorkspaceIndex` with `rebuild(tree)` and `search(query)`.

- [ ] Write search tests for name, path and extension/type.
- [ ] Implement deterministic in-memory index.
- [ ] Run module tests and typecheck.
- [ ] Commit.

### Task 5: Watcher and optional storage bridge contract

**Files:**
- Create: `modules/artisys-files/src/watcher.ts`
- Create: `modules/artisys-files/src/storage-bridge.ts`
- Test: `modules/artisys-files/test/watcher.test.ts`

**Interfaces:**
- Produces: `watchWorkspace(root, onChange)`; `WorkspaceStorageBridge` contract only, with no hard dependency on `artisys-storage`.

- [ ] Write tests for watcher event normalization.
- [ ] Implement watcher based on `fs.watch` and event normalization.
- [ ] Add optional storage bridge contract.
- [ ] Run module tests and typecheck.
- [ ] Commit.

### Task 6: Documentation and catalog integration

**Files:**
- Create: `modules/artisys-files/README.md`
- Modify: `modules/README.md`
- Modify: `docs/MODULE_KITS.md` if an existing desktop/local kit is present.

**Interfaces:**
- Documents public API, Electron usage and separation from `artisys-storage`.

- [ ] Add examples for opening a folder-backed workspace and wiring drag-and-drop.
- [ ] Add module to catalog as `implemented` unless repo verification proves `stable` criteria.
- [ ] Run repository-level checks relevant to module catalog.
- [ ] Commit.

### Task 7: Final verification

**Files:** none expected.

- [ ] Run tests and typecheck for `artisys-files`.
- [ ] Verify no mandatory external service/dependency was introduced.
- [ ] Review diff and module API.
- [ ] Merge only after checks pass.
