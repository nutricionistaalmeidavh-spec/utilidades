import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { WorkspaceIndex, applyDrop, createWorkspace } from '../src/index.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'artisys-files-example-'));

try {
  const workspace = await createWorkspace(root);
  await workspace.createDirectory('Documentos');
  await workspace.writeFile('entrada.txt', 'Arquivo criado pelo app');

  await applyDrop(workspace, {
    sourcePath: 'entrada.txt',
    targetDirectory: 'Documentos',
    mode: 'move',
  });

  const index = new WorkspaceIndex().rebuild(await workspace.listTree());
  console.log(index.search('entrada'));
} finally {
  await rm(root, { recursive: true, force: true });
}
