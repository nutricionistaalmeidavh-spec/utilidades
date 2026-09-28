import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserWorkspace } from '../src/browser.mjs';

class MemoryStorage{#map=new Map();async put(key,value,{metadata={}}={}){this.#map.set(key,{value:structuredClone(value),metadata:structuredClone(metadata)});return{path:key};}async get(key){const found=this.#map.get(key);return found?structuredClone(found):null;}async delete(key){return this.#map.delete(key);}async list(prefix=''){return[...this.#map.keys()].filter(key=>key.startsWith(prefix)).sort();}}

test('browser workspace writes, reads, lists, moves and removes files without node builtins', async()=>{
  const storage=new MemoryStorage();
  const files=createBrowserWorkspace(storage,{root:'attachments'});
  await files.createDirectory('clients/acme');
  await files.writeFile('clients/acme/report.txt','hello');
  assert.equal(await files.readFile('clients/acme/report.txt'),'hello');
  let tree=await files.listTree();
  assert.equal(tree.type,'directory');
  assert.equal(tree.children[0].name,'clients');
  await files.rename('clients/acme/report.txt','final.txt');
  assert.equal(await files.readFile('clients/acme/final.txt'),'hello');
  await files.copy('clients/acme/final.txt','clients/acme/copy.txt');
  await files.move('clients/acme/copy.txt','archive/copy.txt');
  assert.equal(await files.readFile('archive/copy.txt'),'hello');
  await files.remove('clients');
  tree=await files.listTree();
  assert.equal(tree.children.some(entry=>entry.name==='clients'),false);
  assert.equal((await files.health()).ok,true);
});

test('browser workspace blocks path traversal', async()=>{
  const files=createBrowserWorkspace(new MemoryStorage());
  await assert.rejects(()=>files.writeFile('../secret.txt','x'),error=>error?.code==='PATH_TRAVERSAL');
});

test('browser workspace snapshot restores directories, files and metadata exactly', async()=>{
  const storage=new MemoryStorage();
  const files=createBrowserWorkspace(storage,{root:'attachments'});
  await files.createDirectory('clients/acme');
  await files.writeFile('clients/acme/report.txt','original');
  await files.writeFile('root.txt','root-value');

  const snapshot=await files.exportSnapshot();
  assert.equal(snapshot.schemaVersion,1);
  assert.equal(snapshot.root,'attachments');
  assert.ok(snapshot.entries.some(entry=>entry.kind==='directory'&&entry.path==='clients/acme'));
  assert.ok(snapshot.entries.some(entry=>entry.kind==='file'&&entry.path==='clients/acme/report.txt'));

  await files.writeFile('clients/acme/report.txt','mutated');
  await files.writeFile('temporary.txt','remove-me');
  await files.remove('root.txt');

  const restored=await files.importSnapshot(snapshot,{clear:true});
  assert.equal(restored.restored,true);
  assert.equal(await files.readFile('clients/acme/report.txt'),'original');
  assert.equal(await files.readFile('root.txt'),'root-value');
  await assert.rejects(()=>files.readFile('temporary.txt'),/File not found/);
  assert.equal((await files.listTree('clients/acme/report.txt')).modifiedAt!==undefined,true);
});
