function required(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} is required`);
  return value.trim();
}

export function buildGoogleAuthorizationUrl({ clientId, redirectUri, state, scopes }) {
  const scopeList = Array.isArray(scopes) ? scopes.map((scope) => required(scope, 'scope')) : [];
  if (scopeList.length === 0) throw new TypeError('scopes must contain at least one scope');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: required(clientId, 'clientId'),
    redirect_uri: required(redirectUri, 'redirectUri'),
    response_type: 'code',
    scope: [...new Set(scopeList)].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: required(state, 'state')
  }).toString();
  return url.toString();
}

export function buildGoogleTokenRequestBody({ code, clientId, clientSecret, redirectUri }) {
  return new URLSearchParams({
    code: required(code, 'code'),
    client_id: required(clientId, 'clientId'),
    client_secret: required(clientSecret, 'clientSecret'),
    redirect_uri: required(redirectUri, 'redirectUri'),
    grant_type: 'authorization_code'
  }).toString();
}
