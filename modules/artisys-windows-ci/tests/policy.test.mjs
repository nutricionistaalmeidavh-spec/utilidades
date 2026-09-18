import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRUSTED_REPOSITORIES,
  assertTrustedElevatedContext,
  isTrustedRepository,
} from '../src/index.mjs';

test('initial allowlist contains the approved ArtiSys repositories', () => {
  const expected = [
    'nutricionistaalmeidavh-spec/obranamaocomercial',
    'nutricionistaalmeidavh-spec/pdv-artisys',
    'nutricionistaalmeidavh-spec/oficinaagricola',
    'nutricionistaalmeidavh-spec/sistemalavoura',
    'nutricionistaalmeidavh-spec/frota-e-manutencao',
    'nutricionistaalmeidavh-spec/pecuaria',
    'nutricionistaalmeidavh-spec/maquinasagricolas',
  ];
  assert.deepEqual([...DEFAULT_TRUSTED_REPOSITORIES].sort(), expected.sort());
});

test('repository matching is case insensitive but does not accept neighbors', () => {
  assert.equal(isTrustedRepository('nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL'), true);
  assert.equal(isTrustedRepository('NUTRICIONISTAALMEIDAVH-SPEC/pdv-artisys'), true);
  assert.equal(isTrustedRepository('nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL-fork'), false);
  assert.equal(isTrustedRepository('other-owner/OBRANAMAOCOMERCIAL'), false);
});

test('elevated context accepts trusted push on the elevated ArtiSys Windows agent', () => {
  const result = assertTrustedElevatedContext({
    CI_REPO: 'nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL',
    CI_PIPELINE_EVENT: 'push',
    ARTISYS_AGENT_PRIVILEGE: 'elevated',
    ARTISYS_AGENT_OWNER: 'artisys',
    ARTISYS_AGENT_PLATFORM: 'windows/amd64',
  });
  assert.equal(result.repository, 'nutricionistaalmeidavh-spec/obranamaocomercial');
  assert.equal(result.event, 'push');
  assert.equal(result.elevated, true);
});

test('elevated context rejects a repository outside the allowlist', () => {
  assert.throws(() => assertTrustedElevatedContext({
    CI_REPO: 'someone/untrusted',
    CI_PIPELINE_EVENT: 'push',
    ARTISYS_AGENT_PRIVILEGE: 'elevated',
    ARTISYS_AGENT_OWNER: 'artisys',
    ARTISYS_AGENT_PLATFORM: 'windows/amd64',
  }), /not allowlisted/i);
});

test('elevated context rejects pull request events even for a trusted repository', () => {
  assert.throws(() => assertTrustedElevatedContext({
    CI_REPO: 'nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL',
    CI_PIPELINE_EVENT: 'pull_request',
    ARTISYS_AGENT_PRIVILEGE: 'elevated',
    ARTISYS_AGENT_OWNER: 'artisys',
    ARTISYS_AGENT_PLATFORM: 'windows/amd64',
  }), /pull request/i);
});

test('elevated context rejects execution without elevated agent identity', () => {
  assert.throws(() => assertTrustedElevatedContext({
    CI_REPO: 'nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL',
    CI_PIPELINE_EVENT: 'manual',
    ARTISYS_AGENT_PRIVILEGE: 'limited',
    ARTISYS_AGENT_OWNER: 'artisys',
    ARTISYS_AGENT_PLATFORM: 'windows/amd64',
  }), /privilege=elevated/i);
});

test('elevated context rejects wrong owner or platform identity', () => {
  assert.throws(() => assertTrustedElevatedContext({
    CI_REPO: 'nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL',
    CI_PIPELINE_EVENT: 'manual',
    ARTISYS_AGENT_PRIVILEGE: 'elevated',
    ARTISYS_AGENT_OWNER: 'other',
    ARTISYS_AGENT_PLATFORM: 'windows/amd64',
  }), /owner=artisys/i);
  assert.throws(() => assertTrustedElevatedContext({
    CI_REPO: 'nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL',
    CI_PIPELINE_EVENT: 'manual',
    ARTISYS_AGENT_PRIVILEGE: 'elevated',
    ARTISYS_AGENT_OWNER: 'artisys',
    ARTISYS_AGENT_PLATFORM: 'linux/amd64',
  }), /windows\/amd64/i);
});
