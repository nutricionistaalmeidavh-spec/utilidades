const API = 'https://api.github.com';
const UPLOADS = 'https://uploads.github.com';

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }

function headers(token, extra = {}) {
  if (!clean(token)) throw new Error('GitHub release token ausente.');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'artisys-release-publisher',
    ...extra,
  };
}

async function request(url, { token, method = 'GET', body, fetchImpl = globalThis.fetch, raw = false, contentType } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  const response = await fetchImpl(url, {
    method,
    headers: headers(token, contentType ? { 'Content-Type': contentType } : {}),
    ...(body !== undefined ? { body: raw ? body : JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const detail = typeof response.text === 'function' ? await response.text() : '';
    const error = new Error(`GitHub API ${method} ${url} falhou (${response.status}): ${detail}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return typeof response.json === 'function' ? response.json() : null;
}

export function releaseTagForVersion(version) {
  const normalized = clean(version).replace(/^v/i, '');
  if (!normalized) throw new Error('Versao ausente.');
  return `v${normalized}`;
}

export async function ensureGitHubRelease({ token, repo, tag, name, body = '', draft = false, prerelease = false, targetCommitish = null, fetchImpl = globalThis.fetch, apiBase = API }) {
  if (!clean(repo) || !repo.includes('/')) throw new Error('Repositorio invalido.');
  if (!clean(tag)) throw new Error('Tag ausente.');
  try {
    return await request(`${apiBase}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, { token, fetchImpl });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  return await request(`${apiBase}/repos/${repo}/releases`, {
    token,
    method: 'POST',
    body: {
      tag_name: tag,
      name: clean(name) || tag,
      body: body || '',
      draft: Boolean(draft),
      prerelease: Boolean(prerelease),
      ...(clean(targetCommitish) ? { target_commitish: targetCommitish } : {}),
    },
    fetchImpl,
  });
}

export async function uploadReleaseAsset({ token, repo, releaseId, name, data, contentType = 'application/octet-stream', existingAssets = [], fetchImpl = globalThis.fetch, apiBase = API, uploadsBase = UPLOADS }) {
  if (!releaseId) throw new Error('releaseId ausente.');
  if (!clean(name)) throw new Error('Nome do asset ausente.');
  const previous = Array.isArray(existingAssets) ? existingAssets.find((asset) => asset?.name === name) : null;
  if (previous?.id) {
    await request(`${apiBase}/repos/${repo}/releases/assets/${previous.id}`, { token, method: 'DELETE', fetchImpl });
  }
  return await request(`${uploadsBase}/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`, {
    token,
    method: 'POST',
    body: data,
    raw: true,
    contentType,
    fetchImpl,
  });
}

export async function publishGitHubRelease({ token, repo, version, tag = null, name = null, body = '', draft = false, prerelease = false, targetCommitish = null, assets = [], fetchImpl = globalThis.fetch }) {
  const resolvedTag = clean(tag) || releaseTagForVersion(version);
  const release = await ensureGitHubRelease({ token, repo, tag: resolvedTag, name: name || `${repo.split('/').pop()} ${version}`, body, draft, prerelease, targetCommitish, fetchImpl });
  const uploaded = [];
  let knownAssets = Array.isArray(release.assets) ? [...release.assets] : [];
  for (const asset of assets) {
    const result = await uploadReleaseAsset({
      token,
      repo,
      releaseId: release.id,
      name: asset.name,
      data: asset.data,
      contentType: asset.contentType,
      existingAssets: knownAssets,
      fetchImpl,
    });
    uploaded.push(result);
    knownAssets = knownAssets.filter((entry) => entry?.name !== asset.name);
    if (result) knownAssets.push(result);
  }
  return { release, uploaded, tag: resolvedTag };
}
