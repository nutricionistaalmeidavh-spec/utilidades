import { randomUUID } from 'node:crypto';
export function createAuditEntry(value, options={}) {
  if (!value?.action || !value?.actorId) throw new TypeError('action and actorId are required');
  return Object.freeze({id:options.id??randomUUID(),at:new Date(options.at??Date.now()).toISOString(),actorId:String(value.actorId),action:String(value.action),entityType:value.entityType??null,entityId:value.entityId??null,metadata:Object.freeze({...value.metadata})});
}
export class MemoryAuditLog { #entries=[]; async append(entry){this.#entries.push(entry);return entry;} async list(filter={}){return this.#entries.filter(e=>(!filter.actorId||e.actorId===filter.actorId)&&(!filter.action||e.action===filter.action)).slice();} }
