import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const wrapper = await readFile(new URL('../templates/artisys-release/product-wrapper.ps1', import.meta.url), 'utf8');
const lock = JSON.parse(await readFile(new URL('../templates/artisys-release/utilidades.lock.json', import.meta.url), 'utf8'));

test('consumer template is pinned and fail-closed', () => {
  assert.equal(lock.commit, 'a444031860d5b8c91adc5628759bc67c0c29d557');
  assert.deepEqual(lock.requiredModules, ['artisys-release', 'artisys-ci-reporter']);
  assert.match(wrapper, /ARTISYS_UTILIDADES_PATH/);
  assert.match(wrapper, /worktree add --detach/);
  assert.match(wrapper, /cat-file -e/);
  assert.match(wrapper, /artisys-release\.mjs/);
  assert.match(wrapper, /artisys-ci-reporter\.mjs/);
  assert.match(wrapper, /release-run\.json/);
  assert.match(wrapper, /Get-FileHash/);
  assert.doesNotMatch(wrapper, /git\s+pull/i);
  assert.doesNotMatch(wrapper, /checkout\s+main/i);
});
