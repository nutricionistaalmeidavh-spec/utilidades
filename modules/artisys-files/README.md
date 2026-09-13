# `artisys-files`

Workspace local de arquivos para aplicações ArtiSys. O módulo cria/abre uma pasta real do computador e expõe uma API neutra de UI para o app renderizar um Explorer com árvore, drag-and-drop, busca e atualização por mudanças do filesystem.

## Quando usar

Use quando um produto precisa mostrar dentro do app uma estrutura de arquivos que continue existindo como uma pasta normal no Windows/macOS/Linux. O usuário pode organizar pelo app e as alterações são refletidas diretamente no filesystem; mudanças feitas fora do app podem ser acompanhadas pelo watcher.

`artisys-files` **não substitui** `artisys-storage`: este módulo cuida do workspace físico e da organização de arquivos; `artisys-storage` cuida de persistência genérica por chave/namespace. A integração entre ambos é opcional via `createStorageBridge`.

## Requisitos

- Node.js >= 22.
- Nenhuma dependência de runtime.
- Nenhum servidor, daemon, banco dedicado ou serviço pago.
- Compatível com Electron/Node; Tauri pode consumir o mesmo contrato por bridge própria do produto.

## API principal

```js
import {
  WorkspaceIndex,
  applyDrop,
  createWorkspace,
  watchWorkspace,
} from '@artisys/files';

const workspace = await createWorkspace('C:/Dados/MinhaObra');

await workspace.createDirectory('Documentos/Contratos');
await workspace.writeFile('Documentos/observacao.txt', 'Arquivo real no PC');

const tree = await workspace.listTree();

// A UI só traduz o drop para esta intenção; o módulo faz a operação física.
await applyDrop(workspace, {
  sourcePath: 'Documentos/observacao.txt',
  targetDirectory: 'Documentos/Contratos',
  mode: 'move',
});

const index = new WorkspaceIndex().rebuild(await workspace.listTree());
console.log(index.search('observacao'));

const watcher = watchWorkspace(workspace.root, (change) => {
  console.log(change); // { kind: 'changed' | 'renamed', path: '...' }
});

// watcher.close();
```

## Operações de workspace

`createWorkspace(root)` retorna um objeto com:

- `listTree(path?)`: árvore recursiva de arquivos e diretórios.
- `createDirectory(path)`: cria pastas reais.
- `writeFile(path, data)`: cria/atualiza arquivo.
- `rename(path, newName)`: renomeia sem sobrescrever destino existente.
- `move(source, destination)`: move arquivo/pasta sem sobrescrever destino.
- `copy(source, destination)`: copia arquivo/pasta sem sobrescrever destino.
- `remove(path)`: remove arquivo/pasta; o root do workspace não pode ser removido.

## Drag-and-drop

O módulo não impõe React, Vue, Electron renderer ou biblioteca de árvore. No `drop`, a UI envia apenas uma intenção:

```js
await applyDrop(workspace, {
  sourcePath: 'Fotos/fachada.jpg',
  targetDirectory: 'Obra 01/Imagens',
  mode: 'move', // ou 'copy'
});
```

Isso permite reutilizar o mesmo core em qualquer produto e trocar a UI sem alterar a regra de filesystem.

## Segurança de caminhos

Toda operação é confinada ao root do workspace. Caminhos absolutos e `..` que escapem do root são rejeitados. Links simbólicos aparecem na árvore, mas não são seguidos pelas operações do workspace, evitando que um link interno permita gravar fora da pasta escolhida.

## Integração opcional com `artisys-storage`

```js
import { createStorageBridge } from '@artisys/files';
import { createMemoryStorage } from '@artisys/storage';

const storage = createMemoryStorage();
const filesStorage = createStorageBridge(storage, 'workspace-1');
await filesStorage.put('Documentos/a.txt', new TextEncoder().encode('A'));
```

A bridge usa duck typing e **não cria dependência obrigatória** em `@artisys/storage`.

## Testes

```bash
cd modules/artisys-files
npm test
npm run check
```

Os testes cobrem proteção de paths, operações físicas, overwrite protection, drag-and-drop, árvore, busca, watcher normalizado, symlink boundary e storage bridge.
