const clean=(value='')=>{const text=String(value).replaceAll('\\','/').replace(/^\/+|\/+$/g,'');if(text==='..'||text.startsWith('../')||text.includes('/../')){const error=new Error('Workspace path escapes root');error.code='PATH_TRAVERSAL';throw error;}return text;};
const simple=(name)=>{const value=String(name??'');if(!value||value==='.'||value==='..'||value.includes('/')||value.includes('\\'))throw new TypeError('Name must be a single file or directory name');return value;};
const parent=(path)=>{const parts=clean(path).split('/').filter(Boolean);parts.pop();return parts.join('/');};
const base=(path)=>clean(path).split('/').filter(Boolean).at(-1)??'';
const join=(...parts)=>clean(parts.filter(Boolean).join('/'));
const fileKey=(root,path)=>join(root,'files',clean(path));
const dirKey=(root,path)=>join(root,'dirs',clean(path));
const childPrefix=(key)=>`${key}/`;
const relativeFrom=(key,prefix)=>key.slice(prefix.length).replace(/^\//,'');
const clone=(value)=>value==null?value:structuredClone(value);

export function createBrowserWorkspace(storage,{root='attachments'}={}){
  if(!storage||typeof storage.put!=='function'||typeof storage.get!=='function'||typeof storage.list!=='function'||typeof storage.delete!=='function')throw new TypeError('Browser workspace storage must provide put/get/list/delete.');
  const workspaceRoot=clean(root)||'attachments';
  const filesPrefix=join(workspaceRoot,'files');
  const dirsPrefix=join(workspaceRoot,'dirs');
  const ensureParents=async(path)=>{const parts=parent(path).split('/').filter(Boolean);let current='';for(const part of parts){current=join(current,part);await storage.put(dirKey(workspaceRoot,current),{type:'directory',path:current,createdAt:new Date().toISOString()});}};
  const readEntry=async path=>{const key=fileKey(workspaceRoot,path);const record=await storage.get(key);return record?{kind:'file',record}:null;};
  const directoryExists=async path=>Boolean(await storage.get(dirKey(workspaceRoot,path)))||Boolean((await storage.list(childPrefix(fileKey(workspaceRoot,path))))[0])||Boolean((await storage.list(childPrefix(dirKey(workspaceRoot,path))))[0]);
  async function tree(relativePath=''){
    const target=clean(relativePath);const fileKeys=await storage.list(filesPrefix);const dirKeys=await storage.list(dirsPrefix);const dirs=new Set(dirKeys.map(key=>relativeFrom(key,dirsPrefix)).filter(Boolean));
    for(const key of fileKeys){let cursor=parent(relativeFrom(key,filesPrefix));while(cursor){dirs.add(cursor);cursor=parent(cursor);}}
    const node=(path)=>{const name=path?base(path):workspaceRoot;const children=[];const directDirs=[...dirs].filter(item=>parent(item)===path).sort();for(const item of directDirs)children.push(node(item));const directFiles=fileKeys.map(key=>relativeFrom(key,filesPrefix)).filter(item=>parent(item)===path).sort();for(const item of directFiles)children.push({name:base(item),path:item,type:'file'});return{name,path,type:'directory',children};};
    if(target){const file=await readEntry(target);if(file)return{name:base(target),path:target,type:'file',size:file.record?.metadata?.size??undefined,modifiedAt:file.record?.metadata?.modifiedAt};if(!dirs.has(target))throw new Error('Workspace path not found.');}
    return node(target);
  }
  const api={
    root:workspaceRoot,
    listTree:tree,
    async createDirectory(relativePath){const path=clean(relativePath);if(!path)return;await ensureParents(path);await storage.put(dirKey(workspaceRoot,path),{type:'directory',path,createdAt:new Date().toISOString()});},
    async writeFile(relativePath,data){const path=clean(relativePath);if(!path)throw new TypeError('File path is required.');await ensureParents(path);const size=typeof data==='string'?new TextEncoder().encode(data).byteLength:(data?.byteLength??data?.size??undefined);await storage.put(fileKey(workspaceRoot,path),clone(data),{metadata:{size,modifiedAt:new Date().toISOString()}});return path;},
    async readFile(relativePath){const path=clean(relativePath);const found=await storage.get(fileKey(workspaceRoot,path));if(!found)throw new Error('File not found.');return clone(found.value);},
    async remove(relativePath){const path=clean(relativePath);if(!path)throw new Error('Workspace root cannot be removed');const file=await storage.get(fileKey(workspaceRoot,path));if(file)return storage.delete(fileKey(workspaceRoot,path));const fileKeys=await storage.list(childPrefix(fileKey(workspaceRoot,path)));for(const key of fileKeys)await storage.delete(key);const dirKeys=await storage.list(childPrefix(dirKey(workspaceRoot,path)));for(const key of dirKeys)await storage.delete(key);await storage.delete(dirKey(workspaceRoot,path));return true;},
    async copy(sourcePath,destinationPath){const source=clean(sourcePath),destination=clean(destinationPath);if(!source||!destination)throw new TypeError('Source and destination are required.');if(destination===source||destination.startsWith(`${source}/`))throw new Error('Destination cannot be the source or one of its descendants.');if(await storage.get(fileKey(workspaceRoot,destination))||await directoryExists(destination))throw new Error('Destination already exists.');const file=await storage.get(fileKey(workspaceRoot,source));if(file){await ensureParents(destination);await storage.put(fileKey(workspaceRoot,destination),clone(file.value),{metadata:clone(file.metadata??{})});return destination;}if(!(await directoryExists(source)))throw new Error('Source not found.');await api.createDirectory(destination);for(const key of await storage.list(childPrefix(dirKey(workspaceRoot,source)))){const relative=relativeFrom(key,childPrefix(dirKey(workspaceRoot,source)));await api.createDirectory(join(destination,relative));}for(const key of await storage.list(childPrefix(fileKey(workspaceRoot,source)))){const relative=relativeFrom(key,childPrefix(fileKey(workspaceRoot,source)));const entry=await storage.get(key);await ensureParents(join(destination,relative));await storage.put(fileKey(workspaceRoot,join(destination,relative)),clone(entry.value),{metadata:clone(entry.metadata??{})});}return destination;},
    async move(sourcePath,destinationPath){const destination=await api.copy(sourcePath,destinationPath);await api.remove(sourcePath);return destination;},
    async rename(relativePath,newName){const source=clean(relativePath);return api.move(source,join(parent(source),simple(newName)));},
    async exportSnapshot(){
      const entries=[];
      for(const key of await storage.list(dirsPrefix)){
        const path=relativeFrom(key,dirsPrefix);if(!path)continue;const found=await storage.get(key);if(found)entries.push(Object.freeze({kind:'directory',path,value:clone(found.value),metadata:clone(found.metadata??{})}));
      }
      for(const key of await storage.list(filesPrefix)){
        const path=relativeFrom(key,filesPrefix);if(!path)continue;const found=await storage.get(key);if(found)entries.push(Object.freeze({kind:'file',path,value:clone(found.value),metadata:clone(found.metadata??{})}));
      }
      entries.sort((a,b)=>a.kind.localeCompare(b.kind)||a.path.localeCompare(b.path));
      return Object.freeze({schemaVersion:1,root:workspaceRoot,createdAt:new Date().toISOString(),entries:Object.freeze(entries)});
    },
    async importSnapshot(snapshot,{clear=true}={}){
      if(snapshot?.schemaVersion!==1||snapshot?.root!==workspaceRoot||!Array.isArray(snapshot?.entries))throw new TypeError('Invalid browser workspace snapshot.');
      if(clear){for(const key of await storage.list(filesPrefix))await storage.delete(key);for(const key of await storage.list(dirsPrefix))await storage.delete(key);}
      let restored=0;
      for(const entry of snapshot.entries){const path=clean(entry?.path);if(!path||(entry?.kind!=='file'&&entry?.kind!=='directory'))throw new TypeError('Invalid browser workspace snapshot entry.');const key=entry.kind==='file'?fileKey(workspaceRoot,path):dirKey(workspaceRoot,path);await storage.put(key,clone(entry.value),{metadata:clone(entry.metadata??{})});restored+=1;}
      return Object.freeze({restored:true,root:workspaceRoot,entries:restored});
    },
    health:async()=>({ok:true,mode:'browser-storage-files',root:workspaceRoot})
  };
  return Object.freeze(api);
}
