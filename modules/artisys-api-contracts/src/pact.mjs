/** Pact remains development-only and is imported only when explicitly requested. */
export async function createConsumerPact({ consumer, provider, dir }) {
  if (!consumer || !provider || !dir) throw new Error('consumer, provider and dir are required');
  const { PactV3 } = await import('@pact-foundation/pact');
  return new PactV3({ consumer, provider, dir, logLevel: 'error' });
}

export async function verifyProvider({ providerBaseUrl, pactUrls, stateHandlers = {}, publishVerificationResult, ...options }) {
  const url = new URL(providerBaseUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('HTTP(S) provider URL required');
  if (!Array.isArray(pactUrls) || pactUrls.length === 0) throw new Error('At least one pact file required');
  if (publishVerificationResult) throw new Error('This local kit does not publish Pact verification results');
  const { Verifier } = await import('@pact-foundation/pact');
  return new Verifier({ timeout: 10_000, proxyHost: '127.0.0.1', ...options, providerBaseUrl, pactUrls, stateHandlers }).verifyProvider();
}
