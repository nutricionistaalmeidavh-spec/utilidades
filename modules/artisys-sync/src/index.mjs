import { randomUUID } from 'node:crypto';
export class MemorySyncQueue {
  #items=[];
  enqueue(operation,options={}){const item={id:options.id??randomUUID(),operation,createdAt:new Date(options.createdAt??Date.now()).toISOString(),attempts:0,status:'pending',lastError:null};this.#items.push(item);return {...item};}
  pending(){return this.#items.filter(i=>i.status==='pending').map(i=>({...i}));}
  ack(id){const item=this.#items.find(i=>i.id===id);if(!item)return false;item.status='done';return true;}
  fail(id,error){const item=this.#items.find(i=>i.id===id);if(!item)return false;item.attempts+=1;item.lastError=String(error?.message??error);return true;}
}
export function resolveLastWriteWins(local,remote,getVersion=x=>x.updatedAt){return new Date(getVersion(remote))>new Date(getVersion(local))?remote:local;}
