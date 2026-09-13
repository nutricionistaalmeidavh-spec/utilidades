import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { resolveInsideRoot, toWorkspacePath } from './path-guard.js';
import type { WorkspaceChange } from './types.js';

export function normalizeWatchEvent(root: string, eventType: string, filename: string | Buffer | null): WorkspaceChange | null {
  if (!filename) return null;
  const relative = filename.toString();
  const absolute = resolveInsideRoot(root, relative);
  return {
    kind: eventType === 'rename' ? 'renamed' : 'changed',
    path: toWorkspacePath(root, absolute),
  };
}

export function watchWorkspace(
  root: string,
  onChange: (change: WorkspaceChange) => void,
  options: { recursive?: boolean } = { recursive: true },
): FSWatcher {
  const absoluteRoot = path.resolve(root);
  return watch(absoluteRoot, { recursive: options.recursive ?? true }, (eventType, filename) => {
    const change = normalizeWatchEvent(absoluteRoot, eventType, filename);
    if (change) onChange(change);
  });
}
