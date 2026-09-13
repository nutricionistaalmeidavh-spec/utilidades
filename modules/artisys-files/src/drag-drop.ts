import path from 'node:path';
import type { DropRequest } from './types.js';
import type { Workspace } from './workspace.js';

function joinWorkspacePath(directory: string, name: string): string {
  return path.posix.join(directory.replace(/\\/g, '/'), name);
}

export async function applyDrop(workspace: Workspace, request: DropRequest): Promise<string> {
  const source = request.sourcePath.replace(/\\/g, '/');
  const targetDirectory = request.targetDirectory.replace(/\\/g, '/');
  const destination = joinWorkspacePath(targetDirectory, path.posix.basename(source));

  if (source === destination) return destination;
  if (request.mode === 'copy') {
    await workspace.copy(source, destination);
  } else {
    await workspace.move(source, destination);
  }

  return destination;
}
