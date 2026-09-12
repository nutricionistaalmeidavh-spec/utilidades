const key = (namespace,path) => `${namespace}:${String(path).replace(/^\/+/, '')}`;
export class MemoryStorage {
  #data = new Map();
  async put(path,value,options={}) { this.#data.set(path,{value,metadata:options.metadata??{}}); return {path}; }
  async get(path) { return this.#data.get(path) ?? null; }
  async delete(path) { return this.#data.delete(path); }
  async list(prefix='') { return [...this.#data.keys()].filter(k=>k.startsWith(prefix)).sort(); }
}
export function namespaceStorage(storage, namespace) {
  if (!storage || !namespace) throw new TypeError('storage and namespace are required');
  return {put:(path,value,options)=>storage.put(key(namespace,path),value,options),get:path=>storage.get(key(namespace,path)),delete:path=>storage.delete(key(namespace,path)),list:async(prefix='')=>(await storage.list(`${namespace}:${prefix}`)).map(k=>k.slice(namespace.length+1))};
}
