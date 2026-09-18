const normalizeRepository = (value) => String(value || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '').toLowerCase();

export const DEFAULT_TRUSTED_REPOSITORIES = Object.freeze([
  'nutricionistaalmeidavh-spec/obranamaocomercial',
  'nutricionistaalmeidavh-spec/pdv-artisys',
  'nutricionistaalmeidavh-spec/oficinaagricola',
  'nutricionistaalmeidavh-spec/sistemalavoura',
  'nutricionistaalmeidavh-spec/frota-e-manutencao',
  'nutricionistaalmeidavh-spec/pecuaria',
  'nutricionistaalmeidavh-spec/maquinasagricolas',
]);

const trustedSet = new Set(DEFAULT_TRUSTED_REPOSITORIES);

export function isTrustedRepository(repository) {
  return trustedSet.has(normalizeRepository(repository));
}

export function assertTrustedElevatedContext(env = process.env) {
  const repository = normalizeRepository(env.CI_REPO);
  if (!repository) throw new Error('CI_REPO is required for elevated ArtiSys CI.');
  if (!isTrustedRepository(repository)) throw new Error(`Repository not allowlisted for elevated ArtiSys CI: ${repository}`);

  const event = String(env.CI_PIPELINE_EVENT || env.CI_COMMIT_EVENT || '').trim().toLowerCase();
  if (event.includes('pull_request') || event === 'pull-request' || event === 'pr') {
    throw new Error('Pull request events are not allowed on the elevated ArtiSys CI agent.');
  }

  if (String(env.ARTISYS_AGENT_PRIVILEGE || '').trim().toLowerCase() !== 'elevated') {
    throw new Error('Elevated ArtiSys CI requires ARTISYS_AGENT_PRIVILEGE=elevated.');
  }
  if (String(env.ARTISYS_AGENT_OWNER || '').trim().toLowerCase() !== 'artisys') {
    throw new Error('Elevated ArtiSys CI requires ARTISYS_AGENT_OWNER=artisys.');
  }
  if (String(env.ARTISYS_AGENT_PLATFORM || '').trim().toLowerCase() !== 'windows/amd64') {
    throw new Error('Elevated ArtiSys CI requires ARTISYS_AGENT_PLATFORM=windows/amd64.');
  }

  return Object.freeze({ repository, event, elevated: true });
}
