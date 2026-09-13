import { copyFile, cp, mkdir, readdir, rename as fsRename, rm, stat, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveInsideRoot, toWorkspacePath } from './path-guard.js';
import type { WorkspaceEntry, WorkspaceTree } from './types.js';

export interface Workspace {
  readonly root: string;
  listTree(relativePath?: string): Promise<WorkspaceTree>;
  createDirectory(relativePath: string): Promise<void>;
  writeFile(relativePath: string, data: string | Uint8Array): Promise<void>;
  rename(relativePath: string, newName: string): Promise<string>;
  move(sourcePath: string, destinationPath: string): Promise<void>;
  copy(sourcePath: string, destinationPath: string): Promise<void>;
  remove(relativePath: string): Promise<void>;
}

async function toEntry(root: string, absolutePath: string): Promise<WorkspaceEntry> {
  const info = await stat(absolutePath);
  const relative = toWorkspacePath(root, absolutePath);
  const name = path.basename(absolutePath);

  if (info.isDirectory()) {
    return { name, path: relative, type: 'directory', modifiedAt: info.mtime.toISOString() };
  }

  return {
    name,
    path: relative,
    type: 'file',
    size: info.size,
    extension: path.extname(name).replace(/^\./, '').toLowerCase() || undefined,
    modifiedAt: info.mtime.toISOString(),
  };
}

async function buildTree(root: string, absoluteDirectory: string): Promise<WorkspaceTree> {
  const base = await toEntry(root, absoluteDirectory);
  const names = await readdir(absoluteDirectory);
  const children = await Promise.all(
    names.sort((a, b) => a.localeCompare(b)).map(async (name) => {
      const absolute = path.join(absoluteDirectory, name);
      const info = await stat(absolute);
      return info.isDirectory() ? buildTree(root, absolute) : toEntry(root, absolute);
    }),
  );

  return { ...base, type: 'directory', children };
}

export async function createWorkspace(root: string): Promise<Workspace> {
  const absoluteRoot = path.resolve(root);
  await mkdir(absoluteRoot, { recursive: true });

  return {
    root: absoluteRoot,

    async listTree(relativePath = '') {
      return buildTree(absoluteRoot, resolveInsideRoot(absoluteRoot, relativePath));
    },

    async createDirectory(relativePath) {
      await mkdir(resolveInsideRoot(absoluteRoot, relativePath), { recursive: true });
    },

    async writeFile(relativePath, data) {
      const destination = resolveInsideRoot(absoluteRoot, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await fsWriteFile(destination, data);
    },

    async rename(relativePath, newName) {
      if (!newName || newName === '.' || newName === '..' || newName.includes('/') || newName.includes('\\')) {
        throw new Error('newName must be a single file or directory name');
      }
      const source = resolveInsideRoot(absoluteRoot, relativePath);
      const destination = path.join(path.dirname(source), newName);
      resolveInsideRoot(absoluteRoot, toWorkspacePath(absoluteRoot, destination));
      await fsRename(source, destination);
      return toWorkspacePath(absoluteRoot, destination);
    },

    async move(sourcePath, destinationPath) {
      const source = resolveInsideRoot(absoluteRoot, sourcePath);
      const destination = resolveInsideRoot(absoluteRoot, destinationPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await fsRename(source, destination);
    },

    async copy(sourcePath, destinationPath) {
      const source = resolveInsideRoot(absoluteRoot, sourcePath);
      const destination = resolveInsideRoot(absoluteRoot, destinationPath);
      const info = await stat(source);
      await mkdir(path.dirname(destination), { recursive: true });
      if (info.isDirectory()) {
        await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
      } else {
        await copyFile(source, destination);
      }
    },

    async remove(relativePath) {
      if (!relativePath) throw new Error('Workspace root cannot be removed');
      await rm(resolveInsideRoot(absoluteRoot, relativePath), { recursive: true, force: false });
    },
  };
}
