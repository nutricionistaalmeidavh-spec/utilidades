import { validateDomainEvent } from '../domain-event.mjs';

function assertDb(db) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('D1OutboxStore requires a D1-compatible database');
}

function rowToEvent(row) {
  const event = {
    eventId: row.event_id,
    type: row.type,
    aggregate: row.aggregate_type,
    aggregateId: row.aggregate_id,
    source: row.source,
    actor: JSON.parse(row.actor_json),
    payload: JSON.parse(row.payload_json),
    occurredAt: row.occurred_at
  };
  if (row.mutation_id !== null && row.mutation_id !== undefined) event.mutationId = row.mutation_id;
  return validateDomainEvent(event);
}

export class D1OutboxStore {
  constructor(db) { assertDb(db); this.db = db; }

  prepareInsert(event) {
    validateDomainEvent(event);
    return this.db.prepare(`INSERT INTO domain_events
      (event_id, type, aggregate_type, aggregate_id, mutation_id, source, actor_json, payload_json, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` )
      .bind(event.eventId, event.type, event.aggregate, String(event.aggregateId), event.mutationId ?? null, event.source, JSON.stringify(event.actor), JSON.stringify(event.payload), event.occurredAt);
  }

  async insert(event) {
    await this.prepareInsert(event).run();
    return event;
  }

  async listPending(limit = 100) {
    const safeLimit = Math.min(1000, Math.max(1, Number.isInteger(limit) ? limit : 100));
    const result = await this.db.prepare(`SELECT event_id, type, aggregate_type, aggregate_id, mutation_id, source, actor_json, payload_json, occurred_at
      FROM domain_events WHERE dispatched_at IS NULL ORDER BY occurred_at, event_id LIMIT ?`)
      .bind(safeLimit).all();
    return (result?.results || []).map(rowToEvent);
  }

  async markDispatched(eventId) {
    await this.db.prepare(`UPDATE domain_events SET dispatched_at = datetime('now'), last_error = NULL WHERE event_id = ?`).bind(eventId).run();
  }

  async recordFailure(eventId, message) {
    await this.db.prepare(`UPDATE domain_events SET last_error = ? WHERE event_id = ?`).bind(String(message).slice(0, 4000), eventId).run();
  }
}
