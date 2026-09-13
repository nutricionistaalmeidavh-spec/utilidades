import { WorkspaceIndex, applyDrop, createWorkspace } from '../src/index.mjs';

const workspace = await createWorkspace('./workspace');
await workspace.createDirectory('Documentos');
await workspace.writeFile('entrada.txt', 'Arquivo criado pelo app');

await applyDrop(workspace, {
  sourcePath: 'entrada.txt',
  targetDirectory: 'Documentos',
  mode: 'move',
});

const index = new WorkspaceIndex().rebuild(await workspace.listTree());
console.log(index.search('entrada'));
