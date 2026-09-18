export const DEFAULT_TRUSTED_REPOSITORIES = Object.freeze([]);

export function isTrustedRepository() {
  return false;
}

export function assertTrustedElevatedContext() {
  throw new Error('not implemented');
}
