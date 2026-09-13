import { applyDrop, createWorkspace, WorkspaceIndex } from '../src/index.js';

const workspace = await createWorkspace('./workspace');
await workspace.createDirectory('Documentos');
await workspace.writeFile('entrada.txt', 'Arquivo criado pelo app');

// A UI pode ligar seu evento de drag-and-drop diretamente a esta operação.
await applyDrop(workspace, {
  sourcePath: 'entrada.txt',
  targetDirectory: 'Documentos',
  mode: 'move',
});

const tree = await workspace.listTree();
const index = new WorkspaceIndex();
index.rebuild(tree);
console.log(index.search('entrada'));
