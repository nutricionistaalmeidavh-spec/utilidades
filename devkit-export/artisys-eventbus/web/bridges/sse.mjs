export class RemoteEventBridge {
  constructor({ bus, url, EventSourceImpl = globalThis.EventSource, withCredentials = false, onError = () => {} } = {}) {
    if (!bus || typeof bus.publishAsync !== 'function') throw new TypeError('RemoteEventBridge requires an event bus');
    if (typeof url !== 'string' || url.trim() === '') throw new TypeError('RemoteEventBridge requires a URL');
    if (typeof EventSourceImpl !== 'function') throw new TypeError('EventSource is not available');
    if (typeof onError !== 'function') throw new TypeError('onError must be a function');
    this.bus = bus;
    this.url = url;
    this.EventSourceImpl = EventSourceImpl;
    this.withCredentials = Boolean(withCredentials);
    this.onError = onError;
    this.source = null;
  }

  start() {
    if (this.source) return this;
    this.source = new this.EventSourceImpl(this.url, { withCredentials: this.withCredentials });
    this.source.onmessage = async ({ data }) => {
      try {
        const event = JSON.parse(data);
        const report = await this.bus.publishAsync(event);
        if (report.failures?.length) this.onError(new Error(`Remote event ${event.eventId} had ${report.failures.length} subscriber failure(s)`), event);
      } catch (error) {
        this.onError(error);
      }
    };
    this.source.onerror = error => this.onError(error);
    return this;
  }

  stop() {
    if (!this.source) return;
    this.source.onmessage = null;
    this.source.onerror = null;
    this.source.close?.();
    this.source = null;
  }
}
