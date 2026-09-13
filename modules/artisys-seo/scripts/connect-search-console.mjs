import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import {
  buildGoogleAuthorizationUrl,
  buildGoogleTokenRequestBody
} from '../src/google-oauth.mjs';
import { buildBrowserLaunchSpec } from '../src/browser-launch.mjs';
import { SEARCH_CONSOLE_READONLY_SCOPE } from '../src/search-console.mjs';

function credentialsFromRclone() {
  try {
    const result = spawnSync('rclone', ['config', 'dump'], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0 || !result.stdout) return null;
    const config = JSON.parse(result.stdout);
    const remoteName = process.env.ARTISYS_GOOGLE_RCLONE_REMOTE || 'artisys-qa-drive';
    const remote = config?.[remoteName];
    if (!remote?.client_id || !remote?.client_secret) return null;
    return { clientId: remote.client_id, clientSecret: remote.client_secret };
  } catch {
    return null;
  }
}

const savedCredentials = credentialsFromRclone();
const clientId = process.env.ARTISYS_GOOGLE_CLIENT_ID || savedCredentials?.clientId;
const clientSecret = process.env.ARTISYS_GOOGLE_CLIENT_SECRET || savedCredentials?.clientSecret;
if (!clientId || !clientSecret) {
  console.error('Google OAuth credentials were not found.');
  console.error('Expected ARTISYS_GOOGLE_CLIENT_ID / ARTISYS_GOOGLE_CLIENT_SECRET or client_id/client_secret in rclone remote artisys-qa-drive.');
  process.exit(1);
}

function tokenPath() {
  const base = process.env.LOCALAPPDATA || join(homedir(), '.artisys');
  return join(base, 'ArtiSys', 'SEO', 'google-search-console-token.json');
}

function openBrowser(url) {
  const spec = buildBrowserLaunchSpec({ platform: process.platform, url });
  spawn(spec.command, spec.args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

const state = randomUUID();
let resolveAuth;
let rejectAuth;
const authResult = new Promise((resolve, reject) => {
  resolveAuth = resolve;
  rejectAuth = reject;
});

const server = http.createServer((req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const error = requestUrl.searchParams.get('error');
    if (error) throw new Error(`Google OAuth returned: ${error}`);
    if (requestUrl.searchParams.get('state') !== state) throw new Error('OAuth state mismatch.');
    const code = requestUrl.searchParams.get('code');
    if (!code) throw new Error('Authorization code was not returned by Google.');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>ArtiSys SEO conectado</h1><p>Você pode fechar esta aba e voltar ao terminal.</p>');
    resolveAuth(code);
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Falha no OAuth: ${error.message}`);
    rejectAuth(error);
  }
});

server.listen(0, '127.0.0.1', async () => {
  const address = server.address();
  const redirectUri = `http://127.0.0.1:${address.port}/`;
  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    scopes: [SEARCH_CONSOLE_READONLY_SCOPE]
  });

  console.log('Abra este link no navegador DESTE computador e escolha a conta Google que possui o Search Console:');
  console.log('');
  console.log(authorizationUrl);
  console.log('');
  console.log(`Callback local: ${redirectUri}`);
  openBrowser(authorizationUrl);

  try {
    const code = await authResult;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: buildGoogleTokenRequestBody({ code, clientId, clientSecret, redirectUri })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error_description || payload?.error || `HTTP ${response.status}`);
    if (!payload.refresh_token) throw new Error('Google did not return a refresh_token. Re-run with consent and confirm the account.');

    const output = tokenPath();
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({
      refresh_token: payload.refresh_token,
      access_token: payload.access_token,
      expires_in: payload.expires_in,
      scope: payload.scope,
      token_type: payload.token_type,
      created_at: new Date().toISOString()
    }, null, 2), { mode: 0o600 });

    console.log(`Search Console OAuth concluído. Token salvo em: ${output}`);
  } catch (error) {
    console.error(`Falha ao concluir OAuth: ${error.message}`);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
