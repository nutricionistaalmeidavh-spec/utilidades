# AgroFrota ArtiSys Release + Woodpecker Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar definitivamente `SistemaLavoura`, `pecuaria`, `maquinasagricolas` e `frota-e-manutencao` ao fluxo compartilhado `artisys-release` + `artisys-ci-reporter`, com Woodpecker Windows/local, pin reprodutível de `utilidades` e feedback PASS/FAIL no GitHub.

**Architecture:** Cada produto mantém apenas configuração e um bootstrap pequeno. O motor e o reporter continuam exclusivamente em `utilidades`, pinados ao commit `a444031860d5b8c91adc5628759bc67c0c29d557`. O bootstrap cria um worktree temporário detached nesse SHA, executa o `artisys-release` no workspace do produto, publica feedback com `artisys-ci-reporter` e remove o worktree. O release preserva a ordem `installer → qa`; a Fase 7 continua manual com banco legado real e a Fase 8 passa a validar um marcador de release da mesma execução em vez de exigir incorretamente instalador posterior ao QA.

**Tech Stack:** Node.js 22+, PowerShell, Git worktree, Electron Builder/NSIS, Playwright, Woodpecker CI Windows/local, GitHub commit statuses.

**Spec:** `docs/superpowers/specs/2026-09-18-agrofrota-artisys-release-woodpecker-integration-design.md`

## Global Constraints

- O motor compartilhado permanece somente em `utilidades/modules/artisys-release` e `utilidades/modules/artisys-ci-reporter`.
- Pin obrigatório de `utilidades`: `a444031860d5b8c91adc5628759bc67c0c29d557`.
- Nenhum fallback silencioso para `main` de `utilidades`.
- Woodpecker usa `platform: windows/amd64` e `backend: local`.
- Eventos automáticos permitidos: `push`; execução manual também permitida; PR/fork não confiável não roda automaticamente.
- Ordem canônica: `deps → test → build → installer → qa → security → evidence`; etapas ausentes continuam opcionais.
- Etapas obrigatórias nos quatro produtos: `deps`, `test`, `build`, `installer`, `qa`, `evidence`.
- Fase 7 nunca roda com banco fictício no CI comum.
- Fase 8 continua fail-closed e exige evidências do mesmo commit.
- Nenhum segredo ou token é versionado.
- `main` dos quatro produtos e `SistemasNichadosAgroFrota` permanecem intactos até homologação.

---

## File Map

### `utilidades`
- Modify: `templates/artisys-release/README.md` — documentar consumo pinado e reporter.
- Create: `templates/artisys-release/product-wrapper.ps1` — template do bootstrap reprodutível.
- Create: `templates/artisys-release/utilidades.lock.json` — modelo do lock.
- Create: `tests/artisys-release-consumer-template.test.mjs` — validar contrato dos templates sem executar pipeline real.

### Cada produto
- Create: `.artisys/release.json` — comandos reais do produto.
- Create: `.artisys/utilidades.lock` — SHA pinado e módulos requeridos.
- Create: `scripts/artisys-release.ps1` — bootstrap pinado + reporter + release-run evidence.
- Create: `tooling/ci-evidence-check.mjs` — validar F5/Playwright/current commit e artefato.
- Create: `tests/ci-evidence-check.test.js` — fail-closed do evidence step.
- Modify: `tooling/certify-release.mjs` — usar `release-run.json`, não a regra incompatível “installer mais novo que QA”.
- Modify: `tests/certify-release.test.js` — testar marcador/hash/commit da execução.
- Modify: `package.json` — scripts `qa:ci-evidence` e `ci:release`.
- Create: `.woodpecker/artisys-release.yaml` — único workflow Woodpecker.
- Delete: `.woodpecker/verify.yml` — remover pipeline provisório duplicado.
- Modify/Create: `docs/ARTISYS_RELEASE.md` — operação local, Woodpecker, reporter e F7/F8.

---

### Task 1: Harden the reusable consumer template in `utilidades`

**Files:**
- Create: `templates/artisys-release/product-wrapper.ps1`
- Create: `templates/artisys-release/utilidades.lock.json`
- Modify: `templates/artisys-release/README.md`
- Test: `tests/artisys-release-consumer-template.test.mjs`

**Interfaces:**
- Consumes: `ARTISYS_UTILIDADES_PATH`, `.artisys/utilidades.lock`, `.artisys/release.json`, Woodpecker `CI_*` variables.
- Produces: a reusable PowerShell wrapper contract that creates a pinned detached worktree, executes `artisys-release`, calls `artisys-ci-reporter`, writes `qa-artifacts/release-run.json`, then cleans up.

- [ ] **Step 1: Write the failing template-contract test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper = await readFile(new URL('../templates/artisys-release/product-wrapper.ps1', import.meta.url), 'utf8');
const lock = JSON.parse(await readFile(new URL('../templates/artisys-release/utilidades.lock.json', import.meta.url), 'utf8'));

test('consumer template is pinned and fail-closed', () => {
  assert.equal(lock.commit, 'a444031860d5b8c91adc5628759bc67c0c29d557');
  assert.match(wrapper, /ARTISYS_UTILIDADES_PATH/);
  assert.match(wrapper, /worktree add --detach/);
  assert.match(wrapper, /artisys-release\.mjs/);
  assert.match(wrapper, /artisys-ci-reporter\.mjs/);
  assert.match(wrapper, /release-run\.json/);
  assert.doesNotMatch(wrapper, /checkout\s+main/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:
```powershell
node --test tests/artisys-release-consumer-template.test.mjs
```
Expected: FAIL because template files do not exist yet.

- [ ] **Step 3: Add the lock template**

```json
{
  "repository": "nutricionistaalmeidavh-spec/utilidades",
  "commit": "a444031860d5b8c91adc5628759bc67c0c29d557",
  "requiredModules": ["artisys-release", "artisys-ci-reporter"]
}
```

- [ ] **Step 4: Implement the reusable PowerShell wrapper template**

The wrapper must implement this exact state machine:

```powershell
$ErrorActionPreference = 'Stop'
# 1. Resolve product root and read .artisys/utilidades.lock.
# 2. Require ARTISYS_UTILIDADES_PATH and verify it is a git repository.
# 3. Verify the pinned commit exists with: git -C $root cat-file -e "$commit^{commit}".
# 4. Delete stale product release report/log and matching installer artifacts before the run.
# 5. Create a unique temp path and: git -C $root worktree add --detach $temp $commit.
# 6. Record current product HEAD and startedAt.
# 7. Invoke pinned modules/artisys-release/bin/artisys-release.mjs with .artisys/release.json.
# 8. Capture output to artifacts/woodpecker-release.log and keep the real native exit code.
# 9. Write qa-artifacts/release-run.json containing commit, utilidadesCommit, startedAt, finishedAt, status and installer SHA-256 when present.
# 10. Set ARTISYS_CI_RESULT=success|failure and call the pinned artisys-ci-reporter.
# 11. If release succeeded but reporter failed, fail the workflow; if release failed, preserve release failure as non-zero.
# 12. In finally, remove the detached worktree and prune.
```

No `git pull`, `git checkout main`, secret literal, or modification of the shared checkout is allowed.

- [ ] **Step 5: Update the template README**

Document:

```text
ARTISYS_UTILIDADES_PATH=C:\Victor\Artisys\utilidades
GITHUB_REPORT_TOKEN=<host secret>
```

and explain that the wrapper pins the execution engine by SHA and that activating a repository in the Woodpecker UI is still an external operational step.

- [ ] **Step 6: Run template tests GREEN**

```powershell
node --test tests/artisys-release-consumer-template.test.mjs
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add templates/artisys-release tests/artisys-release-consumer-template.test.mjs
git commit -m "feat(release): add pinned Woodpecker consumer template"
```

---

### Task 2: Integrate `SistemaLavoura`

**Files:**
- Create: `.artisys/release.json`
- Create: `.artisys/utilidades.lock`
- Create: `scripts/artisys-release.ps1`
- Create: `tooling/ci-evidence-check.mjs`
- Create: `tests/ci-evidence-check.test.js`
- Modify: `tooling/certify-release.mjs`
- Modify: `tests/certify-release.test.js`
- Modify: `package.json`
- Create: `.woodpecker/artisys-release.yaml`
- Delete: `.woodpecker/verify.yml`
- Create: `docs/ARTISYS_RELEASE.md`

**Interfaces:**
- Product ID: `agro-lavoura`.
- Installer regex: `^ArtiSys-Lavoura-Setup-.*\\.exe$`.
- Existing gates: `npm run check`, `npm run build:web`, `npm run build:win`, `npm run phase5`, `npm run phase7`, `npm run phase8:certify`.

- [ ] **Step 1: Write failing evidence tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCiEvidence} from '../tooling/ci-evidence-check.mjs';

const head = 'a'.repeat(40);
test('CI evidence rejects stale phase5', () => {
  assert.throws(() => validateCiEvidence({head, phase5:{status:'passed',commit:'b'.repeat(40)}, playwright:{status:'passed',commit:head}}), /stale/i);
});
test('CI evidence requires both gates passed', () => {
  assert.throws(() => validateCiEvidence({head, phase5:{status:'failed',commit:head}, playwright:{status:'passed',commit:head}}), /passed/i);
});
```

- [ ] **Step 2: Run RED**

```powershell
node --test tests/ci-evidence-check.test.js
```
Expected: FAIL because `ci-evidence-check.mjs` does not exist.

- [ ] **Step 3: Implement `.artisys/release.json`**

```json
{
  "product": "ArtiSys Lavoura",
  "version": "1.0.0-migration.8",
  "profile": "release",
  "requiredSteps": ["deps", "test", "build", "installer", "qa", "evidence"],
  "steps": {
    "deps": "npm install --no-audit --no-fund",
    "test": "npm run check",
    "build": "npm run build:web",
    "installer": "npm run build:win",
    "qa": "npm run phase5",
    "evidence": "npm run qa:ci-evidence"
  },
  "reportPath": "artifacts/artisys-release-report.json",
  "metadata": {"utilidadesCommit":"a444031860d5b8c91adc5628759bc67c0c29d557"}
}
```

- [ ] **Step 4: Add `.artisys/utilidades.lock`**

Use the exact JSON from Task 1.

- [ ] **Step 5: Add the product wrapper**

Copy the validated Task 1 template to `scripts/artisys-release.ps1` and set product-specific installer discovery to:

```powershell
$env:ARTISYS_INSTALLER_DIR = Join-Path $ProductRoot 'release'
$env:ARTISYS_INSTALLER_PATTERN = '^ArtiSys-Lavoura-Setup-.*\.exe$'
$env:ARTISYS_STATUS_CONTEXT = 'ci/woodpecker/lavoura-release'
```

- [ ] **Step 6: Implement `tooling/ci-evidence-check.mjs`**

```js
export function validateCiEvidence({head, phase5, playwright}) {
  for (const [name, item] of Object.entries({phase5, playwright})) {
    if (item?.status !== 'passed') throw new Error(`${name} evidence must be passed`);
    if (item?.commit !== head) throw new Error(`${name} evidence is stale`);
  }
  return true;
}
```

CLI behavior: read `qa-artifacts/phase5-summary.json`, `qa-artifacts/playwright-summary.json`, resolve `git rev-parse HEAD`, validate, verify one matching installer >1 MiB in `release/`, and exit 1 on any mismatch.

- [ ] **Step 7: Fix F8 ordering semantics**

Replace the current “installer mtime >= newest QA evidence” rule with a release-run contract:

```js
export function validateReleaseRun({head, run, installer}) {
  assert.equal(run.status, 'passed', 'release run is not passed');
  assert.equal(run.commit, head, 'release run is stale');
  assert.equal(run.utilidadesCommit, 'a444031860d5b8c91adc5628759bc67c0c29d557');
  assert.ok(installer.mtimeMs >= Date.parse(run.startedAt), 'installer predates release run');
  assert.equal(installer.sha256, run.installer.sha256, 'installer hash differs from release run');
}
```

Keep F5, F7 and Playwright commit/status validation unchanged.

- [ ] **Step 8: Update certification tests**

Replace the obsolete older-than-QA test with:

```js
test('certification rejects installer from previous release run', () => {
  assert.throws(() => validateReleaseRun({
    head:'a'.repeat(40),
    run:{status:'passed',commit:'a'.repeat(40),utilidadesCommit:'a444031860d5b8c91adc5628759bc67c0c29d557',startedAt:'2026-09-18T10:00:00Z',installer:{sha256:'x'}},
    installer:{mtimeMs:Date.parse('2026-09-18T09:00:00Z'),sha256:'x'}
  }), /predates release run/);
});
```

- [ ] **Step 9: Update package scripts**

Add:

```json
"qa:ci-evidence":"node tooling/ci-evidence-check.mjs",
"ci:release":"powershell -NoProfile -ExecutionPolicy Bypass -File scripts/artisys-release.ps1"
```

Do not alter `phase7` to make it automatic.

- [ ] **Step 10: Replace Woodpecker workflow**

`.woodpecker/artisys-release.yaml`:

```yaml
labels:
  platform: windows/amd64
  backend: local

when:
  - event: [push, manual]

steps:
  - name: artisys-release
    image: powershell.exe
    commands:
      - powershell -NoProfile -ExecutionPolicy Bypass -File scripts/artisys-release.ps1
```

Delete `.woodpecker/verify.yml` only after this file exists.

- [ ] **Step 11: Run product tests**

```powershell
npm install --no-audit --no-fund; npm run check; node --test tests/ci-evidence-check.test.js tests/certify-release.test.js
```
Expected: PASS.

- [ ] **Step 12: Dry-run the shared engine through the pinned wrapper**

Add a wrapper `-DryRun` switch that forwards `--dry-run`, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/artisys-release.ps1 -DryRun
```
Expected: plan generated with required steps and pinned utilidades commit; no installer/QA execution.

- [ ] **Step 13: Commit**

```bash
git add .artisys .woodpecker scripts tooling tests package.json docs/ARTISYS_RELEASE.md
git rm .woodpecker/verify.yml
git commit -m "feat(ci): integrate Lavoura with ArtiSys Woodpecker release"
```

---

### Task 3: Integrate `pecuaria`

Use the same implementation/test cycle as Task 2, changing only these product constants:

```json
{
  "product": "ArtiSys Pecuária",
  "version": "1.0.0-migration.8"
}
```

```text
productId: agro-pecuaria
installer: ^ArtiSys-Pecuaria-Setup-.*\.exe$
status context: ci/woodpecker/pecuaria-release
```

- [ ] **Step 1:** Create the same failing evidence and release-run tests with Pecuária constants.
- [ ] **Step 2:** Run RED: `node --test tests/ci-evidence-check.test.js tests/certify-release.test.js`.
- [ ] **Step 3:** Add `.artisys/release.json` with required steps `deps,test,build,installer,qa,evidence` and the same command mapping as Lavoura.
- [ ] **Step 4:** Add `.artisys/utilidades.lock` pinned to `a444031860d5b8c91adc5628759bc67c0c29d557`.
- [ ] **Step 5:** Add `scripts/artisys-release.ps1` from the validated template with Pecuária installer/status constants.
- [ ] **Step 6:** Add `tooling/ci-evidence-check.mjs` and fix `tooling/certify-release.mjs` to consume `release-run.json`.
- [ ] **Step 7:** Add `qa:ci-evidence` and `ci:release` to `package.json`.
- [ ] **Step 8:** Add `.woodpecker/artisys-release.yaml`; delete `.woodpecker/verify.yml`.
- [ ] **Step 9:** Add `docs/ARTISYS_RELEASE.md` with product paths and F7 manual rule.
- [ ] **Step 10:** Run GREEN: `npm install --no-audit --no-fund; npm run check; node --test tests/ci-evidence-check.test.js tests/certify-release.test.js`.
- [ ] **Step 11:** Run wrapper `-DryRun` and confirm pinned SHA.
- [ ] **Step 12:** Commit: `git commit -m "feat(ci): integrate Pecuaria with ArtiSys Woodpecker release"`.

---

### Task 4: Integrate `maquinasagricolas`

Use the Task 2 implementation with:

```text
product: ArtiSys Máquinas Agrícolas
version: 1.0.0-migration.8
productId: agro-machines
installer: ^ArtiSys-Maquinas-Agricolas-Setup-.*\.exe$
status context: ci/woodpecker/maquinas-agricolas-release
```

- [ ] **Step 1:** Write RED evidence/release-run tests.
- [ ] **Step 2:** Run RED.
- [ ] **Step 3:** Add `.artisys/release.json` and `.artisys/utilidades.lock`.
- [ ] **Step 4:** Add the pinned PowerShell wrapper with Máquinas installer constants.
- [ ] **Step 5:** Add CI evidence validator and correct F8 release-run semantics.
- [ ] **Step 6:** Update package scripts.
- [ ] **Step 7:** Replace provisional Woodpecker workflow.
- [ ] **Step 8:** Add operation docs.
- [ ] **Step 9:** Run `npm install --no-audit --no-fund; npm run check; node --test tests/ci-evidence-check.test.js tests/certify-release.test.js`.
- [ ] **Step 10:** Run wrapper `-DryRun`.
- [ ] **Step 11:** Commit: `git commit -m "feat(ci): integrate Maquinas Agricolas with ArtiSys Woodpecker release"`.

---

### Task 5: Integrate `frota-e-manutencao`

Use the Task 2 implementation with:

```text
product: ArtiSys Frota + Manutenção
version: 1.0.0-migration.8
productId: fleet-maintenance
installer: ^ArtiSys-Frota-Setup-.*\.exe$
status context: ci/woodpecker/frota-manutencao-release
```

Preserve both F7 migration namespaces exactly:

```text
frota/001-initial.sql
manutencao/001-initial.sql
```

- [ ] **Step 1:** Write RED evidence/release-run tests, including an assertion that F7 still requires both namespaces.
- [ ] **Step 2:** Run RED.
- [ ] **Step 3:** Add `.artisys/release.json` and pinned lock.
- [ ] **Step 4:** Add wrapper with Frota installer/status constants.
- [ ] **Step 5:** Add CI evidence validator and correct F8 release-run semantics.
- [ ] **Step 6:** Update package scripts.
- [ ] **Step 7:** Replace provisional Woodpecker workflow.
- [ ] **Step 8:** Add operation docs explicitly stating that Woodpecker does not replace the two-namespace legacy cutover gate.
- [ ] **Step 9:** Run `npm install --no-audit --no-fund; npm run check; node --test tests/ci-evidence-check.test.js tests/certify-release.test.js tests/phase7-cutover.test.js`.
- [ ] **Step 10:** Run wrapper `-DryRun`.
- [ ] **Step 11:** Commit: `git commit -m "feat(ci): integrate Frota with ArtiSys Woodpecker release"`.

---

### Task 6: Cross-product static contract verification

**Files:**
- Create in `utilidades`: `scripts/verify-agrofrota-consumers.mjs`
- Test: `tests/agrofrota-consumers-contract.test.mjs`

**Interfaces:**
- Consumes: local paths supplied through environment variables or CLI arguments for the four product checkouts.
- Produces: one machine-readable summary confirming all four configs use the same utilidades SHA, exactly one Woodpecker workflow, required release steps and no provisional `verify.yml`.

- [ ] **Step 1: Write failing parser/validator tests**

Test pure exported validation against fixture objects:

```js
assert.equal(validateConsumer({lock, release, workflowFiles:['artisys-release.yaml']}).ok, true);
assert.throws(() => validateConsumer({lock:{commit:'wrong'}, release, workflowFiles:['artisys-release.yaml']}), /utilidades commit/);
assert.throws(() => validateConsumer({lock, release, workflowFiles:['artisys-release.yaml','verify.yml']}), /single Woodpecker workflow/);
```

- [ ] **Step 2: Run RED**

```powershell
node --test tests/agrofrota-consumers-contract.test.mjs
```

- [ ] **Step 3: Implement validator**

Validate per product:

```text
lock.commit == a444031860d5b8c91adc5628759bc67c0c29d557
requiredSteps == deps,test,build,installer,qa,evidence
workflowFiles == artisys-release.yaml
workflow contains windows/amd64 + backend local
workflow invokes scripts/artisys-release.ps1
release config contains no phase7 command
```

- [ ] **Step 4: Run GREEN**

```powershell
node --test tests/agrofrota-consumers-contract.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-agrofrota-consumers.mjs tests/agrofrota-consumers-contract.test.mjs
git commit -m "test(release): verify AgroFrota consumer contracts"
```

---

### Task 7: Real Windows/Woodpecker verification without promoting `main`

**Files generated at runtime only:**
- `artifacts/artisys-release-report.json`
- `artifacts/woodpecker-release.log`
- `qa-artifacts/release-run.json`
- product QA artifacts
- `release/*.exe`

- [ ] **Step 1: Ensure the host has the shared checkout and secrets**

```powershell
$env:ARTISYS_UTILIDADES_PATH='C:\Victor\Artisys\utilidades'
# GITHUB_REPORT_TOKEN must already exist as a host secret; do not echo it.
```

- [ ] **Step 2: Verify the pinned commit exists locally**

```powershell
git -C $env:ARTISYS_UTILIDADES_PATH cat-file -e 'a444031860d5b8c91adc5628759bc67c0c29d557^{commit}'
```
Expected: exit 0.

- [ ] **Step 3: Run one product manually first (Lavoura)**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/artisys-release.ps1
```
Expected order in report: deps → test → build → installer → qa → evidence; status PASS; GitHub receives `ci/woodpecker/lavoura-release` success.

- [ ] **Step 4: Verify installer and evidence are from the same run**

Check `qa-artifacts/release-run.json`:

```json
{
  "status":"passed",
  "commit":"<HEAD>",
  "utilidadesCommit":"a444031860d5b8c91adc5628759bc67c0c29d557",
  "installer":{"name":"...exe","sha256":"..."}
}
```

- [ ] **Step 5: Run the same real release on the other three products**

Expected: individual product status contexts and installers; no cross-product artifacts.

- [ ] **Step 6: Activate/confirm all four repositories in the Woodpecker UI**

This is an external operational step. Confirm each repo has a GitHub webhook managed by Woodpecker and the Windows/local agent is online.

- [ ] **Step 7: Trigger one `manual` Woodpecker run per product**

Expected: all four workflows call only `scripts/artisys-release.ps1`; feedback is visible on the corresponding GitHub commit.

- [ ] **Step 8: Confirm failure feedback deliberately without changing production code**

Run a temporary branch with an intentionally invalid required command in `.artisys/release.json`, verify reporter posts failure with failed step/exit code, then discard that temporary branch. Do not merge the intentional failure.

- [ ] **Step 9: Re-run the normal branch and restore green status**

Expected: PASS status replaces the test failure context on the current healthy commit.

---

### Task 8: Final verification and integration decision

- [ ] **Step 1: Compare each integration branch against `migration/standalone-phase-0-8`**

Expected changes only in CI/release/evidence/docs plus the F8 ordering correction.

- [ ] **Step 2: Verify no credentials are committed**

Search for literal `GITHUB_REPORT_TOKEN=`, `WOODPECKER_AGENT_SECRET=`, tokens beginning with known prefixes, and `.env` secrets. Expected: none.

- [ ] **Step 3: Run the complete product-local suites again**

For each product:

```powershell
npm run check; npm run phase5; npm run compat:contract; node --test tests/ci-evidence-check.test.js tests/certify-release.test.js
```

Expected: PASS.

- [ ] **Step 4: Check GitHub statuses**

Each current integration HEAD must have a successful `ci/woodpecker/<product>-release` status from the reporter before proposing merge.

- [ ] **Step 5: Keep F7/F8 certification separate**

Do not mark F8 commercially certified merely because Woodpecker is green. Final certification still requires `ARTISYS_LEGACY_DB` with a real customer-compatible SQLite database and `npm run phase7`, followed by `npm run phase8:certify` on the same commit.

- [ ] **Step 6: Present branches for human merge decision**

Do not merge to `main` automatically. Preserve the monorepo rollback source.
