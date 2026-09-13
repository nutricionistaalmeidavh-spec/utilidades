import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  createGoogleRefreshTokenProvider,
  createSearchConsoleClient
} from '../src/index.mjs';

export function localTokenPath() {
  const base = process.env.LOCALAPPDATA || join(homedir(), '.artisys');
  return join(base, 'ArtiSys', 'SEO', 'google-search-console-token.json');
}

export function credentialsFromRclone() {
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

export async function readLocalSearchConsoleToken() {
  const raw = await readFile(localTokenPath(), 'utf8');
  const token = JSON.parse(raw);
  if (!token?.refresh_token) throw new Error('Search Console token file does not contain refresh_token. Run google:connect again.');
  return token;
}

export async function createLocalSearchConsoleRuntime() {
  const savedCredentials = credentialsFromRclone();
  const clientId = process.env.ARTISYS_GOOGLE_CLIENT_ID || savedCredentials?.clientId;
  const clientSecret = process.env.ARTISYS_GOOGLE_CLIENT_SECRET || savedCredentials?.clientSecret;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials were not found in environment or rclone remote artisys-qa-drive.');
  }

  const token = await readLocalSearchConsoleToken();
  const refreshToken = process.env.ARTISYS_GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN || token.refresh_token;
  const getAccessToken = createGoogleRefreshTokenProvider({ clientId, clientSecret, refreshToken });
  return {
    getAccessToken,
    client: createSearchConsoleClient({ getAccessToken }),
    tokenPath: localTokenPath()
  };
}
