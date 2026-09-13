import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleRefreshTokenProvider } from '../src/index.mjs';

test('refresh token provider exchanges refresh token and caches access token until near expiry', async () => {
  let now = 1_000_000;
  const calls = [];
  const getAccessToken = createGoogleRefreshTokenProvider({
    clientId: 'client.apps.googleusercontent.com',
    clientSecret: 'secret-123',
    refreshToken: 'refresh-123',
    now: () => now,
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ access_token: `access-${calls.length}`, expires_in: 3600, token_type: 'Bearer' }), { status: 200 });
    }
  });

  assert.equal(await getAccessToken(), 'access-1');
  assert.equal(await getAccessToken(), 'access-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
  const body = new URLSearchParams(calls[0].options.body);
  assert.equal(body.get('client_id'), 'client.apps.googleusercontent.com');
  assert.equal(body.get('client_secret'), 'secret-123');
  assert.equal(body.get('refresh_token'), 'refresh-123');
  assert.equal(body.get('grant_type'), 'refresh_token');

  now += 3_550_000;
  assert.equal(await getAccessToken(), 'access-2');
  assert.equal(calls.length, 2);
});

test('refresh token provider exposes Google OAuth errors without leaking secrets', async () => {
  const getAccessToken = createGoogleRefreshTokenProvider({
    clientId: 'client.apps.googleusercontent.com',
    clientSecret: 'top-secret',
    refreshToken: 'refresh-secret',
    fetch: async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }), { status: 400 })
  });

  await assert.rejects(
    () => getAccessToken(),
    (error) => error.name === 'GoogleOAuthTokenError' && error.status === 400 && /expired or revoked/i.test(error.message) && !error.message.includes('top-secret') && !error.message.includes('refresh-secret')
  );
});
