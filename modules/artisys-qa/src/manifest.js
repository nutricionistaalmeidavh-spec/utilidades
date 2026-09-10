import fs from 'node:fs/promises';
import path from 'node:path';
import { VIEWPORTS } from './config.js';

const MODES = new Set(['web', 'electron']);

export async function loadQaManifest(filePath) {
  const absolute = path.resolve(filePath);
  const raw = await fs.readFile(absolute, 'utf8');
  const manifest = JSON.parse(raw);
  validateQaManifest(manifest);
  return { manifest, absolute, rootDir: path.dirname(absolute) };
}

export function validateQaManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new TypeError('QA manifest must be an object');
  if (manifest.schemaVersion !== 1) throw new TypeError('schemaVersion must be 1');
  if (!manifest.systemId || typeof manifest.systemId !== 'string') throw new TypeError('systemId is required');
  if (!MODES.has(manifest.mode)) throw new TypeError('mode must be web or electron');
  if (!manifest.flows || typeof manifest.flows !== 'object' || !Object.keys(manifest.flows).length) throw new TypeError('At least one flow is required');
  if (!manifest.environments || typeof manifest.environments !== 'object') throw new TypeError('environments is required');
  for (const [name, env] of Object.entries(manifest.environments)) {
    if (!env || typeof env !== 'object') throw new TypeError(`Invalid environment: ${name}`);
    if (manifest.mode === 'web') {
      if (!env.baseURL) throw new TypeError(`baseURL is required for environment ${name}`);
      const protocol = new URL(env.baseURL).protocol;
      if (!['http:', 'https:', 'file:'].includes(protocol)) throw new TypeError(`Unsupported baseURL protocol: ${protocol}`);
    }
  }
  if (manifest.defaultViewport && !VIEWPORTS[manifest.defaultViewport] && typeof manifest.defaultViewport !== 'object') {
    throw new TypeError(`Unknown viewport: ${manifest.defaultViewport}`);
  }
  if (manifest.mode === 'electron' && !manifest.electron?.entry) throw new TypeError('electron.entry is required in electron mode');
  return true;
}

export function resolveEnvironment(manifest, requested) {
  const name = requested || manifest.defaultEnvironment || Object.keys(manifest.environments)[0];
  const environment = manifest.environments[name];
  if (!environment) throw new Error(`Unknown environment: ${name}`);
  return { name, environment };
}

export function resolveFlow(manifest, requested, rootDir) {
  const name = requested || manifest.defaultFlow || Object.keys(manifest.flows)[0];
  const relative = manifest.flows[name];
  if (!relative) throw new Error(`Unknown flow: ${name}`);
  return { name, file: path.resolve(rootDir, relative) };
}

export function resolveViewport(manifest, requested) {
  const value = requested || manifest.defaultViewport || 'desktop';
  if (typeof value === 'object') return value;
  const viewport = VIEWPORTS[value];
  if (!viewport) throw new Error(`Unknown viewport: ${value}`);
  return { name: value, ...viewport };
}
