import { validateDomainEvent } from './domain-event.mjs';

export class WebIdempotentEffectRunner {
  constructor({ effectStore } = {}) {
    if (!effectStore || typeof effectStore.hasApplied !== 'function' || typeof effectStore.markApplied !== 'function') {
      throw new TypeError('WebIdempotentEffectRunner requires effectStore.hasApplied() and effectStore.markApplied()');
    }
    this.effectStore = effectStore;
  }

  async run({ event, effectKey, handler } = {}) {
    validateDomainEvent(event);
    if (typeof effectKey !== 'string' || effectKey.trim() === '') throw new TypeError('effectKey must be a non-empty string');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (await this.effectStore.hasApplied(event.eventId, effectKey)) {
      return { eventId:event.eventId,effectKey,applied:false,skipped:true };
    }
    const value = await handler(event);
    const record = await this.effectStore.markApplied({eventId:event.eventId,effectKey,aggregate:event.aggregate,aggregateId:event.aggregateId,appliedAt:new Date().toISOString()});
    return { eventId:event.eventId,effectKey,applied:true,skipped:false,value,record };
  }
}
