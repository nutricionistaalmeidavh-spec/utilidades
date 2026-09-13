import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleAuthorizationUrl,
  buildGoogleTokenRequestBody
} from '../src/google-oauth.mjs';
import { SEARCH_CONSOLE_READONLY_SCOPE } from '../src/search-console.mjs';

test('buildGoogleAuthorizationUrl creates an offline consent URL for Search Console', () => {
  const url = new URL(buildGoogleAuthorizationUrl({
    clientId: 'client.apps.googleusercontent.com',
    redirectUri: 'http://127.0.0.1:53683/',
    state: 'state-123',
    scopes: [SEARCH_CONSOLE_READONLY_SCOPE]
  }));

  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('client_id'), 'client.apps.googleusercontent.com');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://127.0.0.1:53683/');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('prompt'), 'consent');
  assert.equal(url.searchParams.get('include_granted_scopes'), 'true');
  assert.equal(url.searchParams.get('state'), 'state-123');
  assert.equal(url.searchParams.get('scope'), SEARCH_CONSOLE_READONLY_SCOPE);
});

test('buildGoogleTokenRequestBody creates authorization_code payload', () => {
  const body = new URLSearchParams(buildGoogleTokenRequestBody({
    code: 'code-123',
    clientId: 'client.apps.googleusercontent.com',
    clientSecret: 'secret-123',
    redirectUri: 'http://127.0.0.1:53683/'
  }));

  assert.equal(body.get('code'), 'code-123');
  assert.equal(body.get('client_id'), 'client.apps.googleusercontent.com');
  assert.equal(body.get('client_secret'), 'secret-123');
  assert.equal(body.get('redirect_uri'), 'http://127.0.0.1:53683/');
  assert.equal(body.get('grant_type'), 'authorization_code');
});
