const randomId=()=>{if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();if(typeof globalThis.crypto?.getRandomValues==='function'){const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;}throw new Error('Web Crypto is required for sync identifiers.');};
export class MemorySyncQueue {
  #items=[];
  enqueue(operation,options={}){const item={id:options.id??randomId(),operation,createdAt:new Date(options.createdAt??Date.now()).toISOString(),attempts:0,status:'pending',lastError:null};this.#items.push(item);return {...item};}
  pending(){return this.#items.filter(i=>i.status==='pending').map(i=>({...i}));}
  ack(id){const item=this.#items.find(i=>i.id===id);if(!item)return false;item.status='done';return true;}
  fail(id,error){const item=this.#items.find(i=>i.id===id);if(!item)return false;item.attempts+=1;item.lastError=String(error?.message??error);return true;}
}
export function resolveLastWriteWins(local,remote,getVersion=x=>x.updatedAt){return new Date(getVersion(remote))>new Date(getVersion(local))?remote:local;}
export function createPersistentSyncQueue(store, options = {}) {
  if (!store || typeof store.putRecord !== 'function' || typeof store.getRecord !== 'function' || typeof store.listRecords !== 'function') throw new TypeError('store must expose putRecord/getRecord/listRecords');
  const collection = String(options.collection ?? '__artisys_sync_outbox__');
  const itemOf = (record) => record?.payload ?? null;
  return Object.freeze({
    async enqueue(operation, enqueueOptions = {}) {const id = String(enqueueOptions.id ?? randomId());const item = { id, operation, createdAt: new Date(enqueueOptions.createdAt ?? Date.now()).toISOString(), attempts: 0, status: 'pending', lastError: null };await store.putRecord(collection, id, item, { expectedVersion: 0 });return { ...item };},
    async pending() {const records = await store.listRecords(collection);return records.map(itemOf).filter((item) => item?.status === 'pending').sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id)).map((item) => ({ ...item }));},
    async ack(id) {const record = await store.getRecord(collection, String(id));if (!record) return false;await store.putRecord(collection, String(id), { ...record.payload, status: 'done' }, { expectedVersion: record.version });return true;},
    async fail(id, error) {const record = await store.getRecord(collection, String(id));if (!record) return false;await store.putRecord(collection, String(id), { ...record.payload, attempts: Number(record.payload.attempts ?? 0) + 1, lastError: String(error?.message ?? error) }, { expectedVersion: record.version });return true;}
  });
}
