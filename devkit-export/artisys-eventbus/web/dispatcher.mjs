function assertAdapterMethod(adapter, methodName) {
  if (!adapter || typeof adapter[methodName] !== 'function') throw new TypeError(`WebDomainEventDispatcher outbox must implement ${methodName}()`);
}

export class WebDomainEventDispatcher {
  constructor({ bus, outbox, batchSize = 100 } = {}) {
    if (!bus || typeof bus.publish !== 'function') throw new TypeError('WebDomainEventDispatcher requires a bus with publish()');
    assertAdapterMethod(outbox, 'listPending');
    assertAdapterMethod(outbox, 'markDispatched');
    assertAdapterMethod(outbox, 'recordFailure');
    if (!Number.isInteger(batchSize) || batchSize <= 0) throw new TypeError('WebDomainEventDispatcher batchSize must be a positive integer');
    this.bus = bus;
    this.outbox = outbox;
    this.batchSize = batchSize;
  }

  async dispatchPending() {
    const events = await this.outbox.listPending(this.batchSize);
    if (!Array.isArray(events)) throw new TypeError('Domain event outbox listPending() must return an array');
    let dispatched = 0;
    let failed = 0;
    const failures = [];
    for (const event of events) {
      let result;
      try {
        result = typeof this.bus.publishAsync === 'function' ? await this.bus.publishAsync(event) : this.bus.publish(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.outbox.recordFailure(event?.eventId || null, message);
        failed += 1;
        failures.push({ eventId: event?.eventId || null, message });
        continue;
      }
      if (!result || !Array.isArray(result.failures)) {
        const message = 'EventBus returned an invalid delivery result';
        await this.outbox.recordFailure(event.eventId, message);
        failed += 1;
        failures.push({ eventId: event.eventId, message });
        continue;
      }
      if (result.failures.length > 0) {
        const message = result.failures.map(f => `${f.handler}: ${f.message}`).join('; ');
        await this.outbox.recordFailure(event.eventId, message);
        failed += 1;
        failures.push({ eventId: event.eventId, message });
        continue;
      }
      await this.outbox.markDispatched(event.eventId);
      dispatched += 1;
    }
    return { attempted: events.length, dispatched, failed, failures };
  }
}
