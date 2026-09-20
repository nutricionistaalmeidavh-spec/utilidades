import { randomUUID } from "node:crypto";

export const AGRO_CONTRACT_VERSION = "1.0";
export const AGRO_EVENTS = Object.freeze([
  "machine.registered","machine.hours.recorded","machine.usage.recorded",
  "fueling.recorded","maintenance.completed","machine.cost.updated",
  "field-operation.machine-used"
]);

const required = (v, name) => {
  if (v === undefined || v === null || v === "") throw new Error(`Campo obrigatório: ${name}`);
  return v;
};

export function createAgroEvent({ event, source, entityId, occurredAt = new Date().toISOString(), data = {}, links = {}, eventId }) {
  if (!AGRO_EVENTS.includes(event)) throw new Error(`Evento não suportado: ${event}`);
  required(source, "source"); required(entityId, "entityId");
  const id = eventId || randomUUID();
  return { schemaVersion: AGRO_CONTRACT_VERSION, eventId: id, event, source, entityId, occurredAt, data, links };
}

export function validateAgroEvent(value) {
  required(value?.eventId, "eventId");
  if (value?.schemaVersion !== AGRO_CONTRACT_VERSION) throw new Error("Versão de contrato incompatível");
  if (!AGRO_EVENTS.includes(value?.event)) throw new Error("Evento não suportado");
  required(value?.source, "source"); required(value?.entityId, "entityId"); required(value?.occurredAt, "occurredAt");
  return value;
}

export function entityRef(product, type, id) {
  return `artisys://${required(product,"product")}/${required(type,"type")}/${required(id,"id")}`;
}
