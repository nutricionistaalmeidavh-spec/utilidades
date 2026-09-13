import path from 'node:path';

function normalizeRelative(relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error('Workspace paths must be relative');
  }

  const normalized = path.normalize(relativePath || '.');
  if (normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new Error('Workspace path escapes root');
  }

  return normalized === '.' ? '' : normalized;
}

export function resolveInsideRoot(root: string, relativePath: string): string {
  const absoluteRoot = path.resolve(root);
  const normalized = normalizeRelative(relativePath);
  const resolved = path.resolve(absoluteRoot, normalized);
  const rel = path.relative(absoluteRoot, resolved);

  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error('Workspace path escapes root');
  }

  return resolved;
}

export function toWorkspacePath(root: string, absolutePath: string): string {
  const absoluteRoot = path.resolve(root);
  const resolved = path.resolve(absolutePath);
  const relative = path.relative(absoluteRoot, resolved);

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Path is outside workspace root');
  }

  return relative.split(path.sep).join('/');
}
