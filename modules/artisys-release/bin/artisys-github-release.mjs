#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { publishGitHubRelease, releaseTagForVersion } from '../src/github-release.mjs';

function contentType(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'text/yaml; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

async function packageVersion(workspace) {
  const pkg = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8'));
  return pkg.version;
}

async function collectAssets(dir, pattern) {
  const regex = new RegExp(pattern || '\\.(exe|blockmap|yml|yaml|json)$', 'i');
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && regex.test(entry.name)).sort((a,b)=>a.name.localeCompare(b.name));
  return await Promise.all(files.map(async (entry) => ({
    name: entry.name,
    data: await readFile(path.join(dir, entry.name)),
    contentType: contentType(entry.name),
  })));
}

function assertRequiredAssets(assets, patternsValue) {
  const patterns = String(patternsValue || '').split(';').map((item) => item.trim()).filter(Boolean);
  for (const source of patterns) {
    const regex = new RegExp(source, 'i');
    if (!assets.some((asset) => regex.test(asset.name))) throw new Error(`Asset obrigatorio ausente: /${source}/`);
  }
}

async function main() {
  const workspace = process.env.CI_WORKSPACE || process.cwd();
  const token = process.env.GITHUB_RELEASE_TOKEN || process.env.GITHUB_REPORT_TOKEN;
  const repo = process.env.ARTISYS_RELEASE_REPO || process.env.CI_REPO;
  const version = process.env.ARTISYS_RELEASE_VERSION || await packageVersion(workspace);
  const expectedTag = releaseTagForVersion(version);
  const tag = process.env.CI_COMMIT_TAG || process.env.ARTISYS_RELEASE_TAG || expectedTag;
  if (tag !== expectedTag && process.env.ARTISYS_ALLOW_TAG_MISMATCH !== 'true') {
    throw new Error(`Tag ${tag} nao corresponde a versao ${version} (${expectedTag}).`);
  }
  const assetDir = path.resolve(workspace, process.env.ARTISYS_RELEASE_ASSET_DIR || 'dist');
  const assets = await collectAssets(assetDir, process.env.ARTISYS_RELEASE_ASSET_PATTERN);
  if (!assets.length) throw new Error(`Nenhum asset de release encontrado em ${assetDir}.`);
  assertRequiredAssets(assets, process.env.ARTISYS_RELEASE_REQUIRED_ASSETS);

  let body = process.env.ARTISYS_RELEASE_NOTES || `Release automatica ArtiSys ${version}.`;
  const evidencePath = process.env.ARTISYS_RELEASE_EVIDENCE;
  if (evidencePath) {
    try {
      const evidence = JSON.parse(await readFile(path.resolve(workspace, evidencePath), 'utf8'));
      body += `\n\nBuild: ${evidence.product || repo}\nSHA-256 registrado para ${Array.isArray(evidence.artifacts) ? evidence.artifacts.length : 0} artefato(s).`;
    } catch {}
  }

  const result = await publishGitHubRelease({
    token,
    repo,
    version,
    tag,
    name: process.env.ARTISYS_RELEASE_NAME || `${repo.split('/').pop()} ${version}`,
    body,
    prerelease: process.env.ARTISYS_RELEASE_PRERELEASE === 'true',
    draft: process.env.ARTISYS_RELEASE_DRAFT === 'true',
    targetCommitish: process.env.CI_COMMIT_SHA || null,
    assets,
  });
  console.log(`[ArtiSys Release] GitHub Release ${result.tag} publicada com ${result.uploaded.length} asset(s).`);
}

main().catch((error) => {
  console.error(`[ArtiSys Release] ${error.stack || error.message}`);
  process.exitCode = 1;
});
