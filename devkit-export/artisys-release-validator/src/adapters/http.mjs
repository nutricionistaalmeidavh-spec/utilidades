export async function probeHttp(spec = {}) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new TypeError('HTTP spec must be an object');
  if (typeof spec.url !== 'string' || !spec.url.trim()) throw new TypeError('HTTP url is required');
  const expectedStatus = spec.expectedStatus ?? [200];
  if (!Array.isArray(expectedStatus) || expectedStatus.some(status => !Number.isInteger(Number(status)))) throw new TypeError('expectedStatus must be an array of integers');
  const timeoutMs = Number(spec.timeoutMs ?? 5_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new TypeError('HTTP timeoutMs must be a positive integer');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  const started = Date.now();
  try {
    const response = await fetch(spec.url, {
      method: spec.method || 'GET',
      headers: spec.headers || undefined,
      body: spec.body ?? undefined,
      redirect: spec.redirect || 'manual',
      signal: controller.signal
    });
    const body = (await response.text()).slice(0, Number(spec.maxBodyChars ?? 4096));
    const allowed = expectedStatus.map(Number).includes(response.status);
    return {
      status: allowed ? 'pass' : 'fail',
      httpStatus: response.status,
      body,
      timedOut: false,
      reason: allowed ? null : `unexpected-http-status-${response.status}`,
      durationMs: Math.max(0, Date.now() - started)
    };
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return {
      status: 'fail',
      httpStatus: null,
      body: '',
      timedOut,
      reason: timedOut ? 'timeout' : String(error?.message || error),
      durationMs: Math.max(0, Date.now() - started)
    };
  } finally {
    clearTimeout(timer);
  }
}
