function assertDb(db) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('D1EffectStore requires a D1-compatible database');
}

export class D1EffectStore {
  constructor(db) { assertDb(db); this.db = db; }

  async hasApplied(eventId, effectKey) {
    const row = await this.db.prepare('SELECT 1 AS found FROM domain_event_effects WHERE event_id = ? AND effect_key = ? LIMIT 1').bind(eventId, effectKey).first();
    return Boolean(row);
  }

  async markApplied(effect) {
    if (!effect || !effect.eventId || !effect.effectKey || !effect.aggregate || effect.aggregateId === undefined || effect.aggregateId === null) {
      throw new TypeError('D1 effect requires eventId, effectKey, aggregate and aggregateId');
    }
    await this.db.prepare(`INSERT OR IGNORE INTO domain_event_effects
      (event_id, effect_key, aggregate_type, aggregate_id, applied_at)
      VALUES (?, ?, ?, ?, datetime('now'))`)
      .bind(effect.eventId, effect.effectKey, effect.aggregate, String(effect.aggregateId)).run();
  }
}
