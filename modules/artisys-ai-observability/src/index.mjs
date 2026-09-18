const SECRET_KEY = /(api[_-]?key|apikey|token|secret|password|passwd|authorization|client[_-]?secret)/i;
const CONTENT_KEY = /^(?:input\.value|output\.value|llm\.(?:input|output)_messages(?:\.|$)|llm\.prompts(?:\.|$)|llm\.choices(?:\.|$))/i;

function text(value) { return String(value ?? ''); }
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!plainObject(value)) return value;
  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = sanitizeValue(nested);
  }
  return out;
}

function attributeValue(value) {
  if (value == null) return value;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value) && value.every(item => ['string', 'number', 'boolean'].includes(typeof item))) return [...value];
  try { return JSON.stringify(sanitizeValue(value)); }
  catch { return text(value); }
}

function safeAttributes(attributes = {}, options = {}) {
  const out = {};
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (SECRET_KEY.test(key)) continue;
    if (!options.captureContent && CONTENT_KEY.test(key)) continue;
    out[key] = attributeValue(value);
  }
  return out;
}

export function inferOpenInferenceSpanKind(name, attributes = {}) {
  const value = `${text(name)} ${text(attributes?.kind)} ${text(attributes?.type)}`.toLowerCase();
  if (/guard|security|policy|injection/.test(value)) return 'GUARDRAIL';
  if (/eval|quality|judge|score/.test(value)) return 'EVALUATOR';
  if (/embed/.test(value)) return 'EMBEDDING';
  if (/tool|mcp\.invoke|function[_ .-]?call/.test(value)) return 'TOOL';
  if (/retriev|rag\.search|vector[_ .-]?search|repo\.search/.test(value)) return 'RETRIEVER';
  if (/llm|answer\.generate|model\.generate|generation/.test(value)) return 'LLM';
  if (/agent/.test(value)) return 'AGENT';
  return 'CHAIN';
}

function openInferenceAttributes(name, attributes = {}, trace = {}, options = {}) {
  const safe = safeAttributes(attributes, options);
  const kind = inferOpenInferenceSpanKind(name, safe);
  const mapped = { ...safe, 'openinference.span.kind': kind };
  const sessionId = safe.sessionId ?? safe.session_id ?? trace?.attributes?.sessionId ?? trace?.attributes?.session_id ?? options.sessionId;
  if (sessionId != null && text(sessionId).trim()) mapped['session.id'] = text(sessionId);
  const model = safe.model ?? safe.modelName ?? safe.model_name;
  if (model != null) mapped['llm.model_name'] = text(model);
  const provider = safe.provider ?? safe.llmProvider ?? safe.llm_provider;
  if (provider != null) mapped['llm.provider'] = text(provider);
  const tool = safe.tool ?? safe.toolName ?? safe.tool_name;
  if (kind === 'TOOL' && tool != null) mapped['tool.name'] = text(tool);
  mapped.metadata = JSON.stringify({ traceId: trace.traceId ?? null, originalName: name, status: trace.status ?? null });
  return mapped;
}

function normalizeEvent(event, options = {}) {
  return {
    name: text(event?.name || 'event'),
    at: event?.at ?? null,
    attributes: safeAttributes(event?.attributes ?? {}, options),
  };
}

function localHost(hostname) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(hostname).toLowerCase());
}

function phoenixEndpoints(endpoint = 'http://localhost:6006') {
  const url = new URL(endpoint);
  const explicitTracePath = /\/v1\/traces\/?$/.test(url.pathname);
  if (explicitTracePath) {
    const app = new URL(url.toString());
    app.pathname = app.pathname.replace(/\/v1\/traces\/?$/, '') || '/';
    return {
      applicationEndpoint: app.toString().replace(/\/$/, ''),
      tracesEndpoint: url.toString().replace(/\/$/, ''),
      url,
    };
  }
  const applicationEndpoint = url.toString().replace(/\/$/, '');
  return { applicationEndpoint, tracesEndpoint: `${applicationEndpoint}/v1/traces`, url };
}

export function toOpenInferenceTrace(trace, options = {}) {
  if (!plainObject(trace)) throw new TypeError('trace must be an object');
  const projectName = text(options.projectName ?? 'rag-artisys');
  const serviceName = text(options.serviceName ?? 'rag-artisys-repos');
  const rootSpanId = text(options.rootSpanId ?? `${trace.traceId ?? 'trace'}:root`);
  const rootAttributes = openInferenceAttributes(trace.name ?? 'trace', trace.attributes ?? {}, trace, options);
  const spans = [{
    name: text(trace.name ?? 'trace'),
    spanId: rootSpanId,
    parentSpanId: null,
    startedAt: trace.startedAt ?? null,
    endedAt: trace.endedAt ?? null,
    status: trace.status ?? 'unset',
    attributes: rootAttributes,
    events: [],
  }];
  for (const span of trace.spans ?? []) {
    spans.push({
      name: text(span?.name ?? 'span'),
      spanId: text(span?.spanId ?? ''),
      parentSpanId: span?.parentSpanId ?? rootSpanId,
      startedAt: span?.startedAt ?? null,
      endedAt: span?.endedAt ?? null,
      status: span?.status ?? 'unset',
      attributes: openInferenceAttributes(span?.name ?? 'span', span?.attributes ?? {}, trace, options),
      events: (span?.events ?? []).map(event => normalizeEvent(event, options)),
    });
  }
  return {
    schema: 'openinference-compatible/v1',
    traceId: trace.traceId ?? null,
    name: text(trace.name ?? 'trace'),
    startedAt: trace.startedAt ?? null,
    endedAt: trace.endedAt ?? null,
    status: trace.status ?? 'unset',
    resource: {
      'service.name': serviceName,
      'openinference.project.name': projectName,
    },
    spans,
  };
}

export function createPhoenixConfig(options = {}) {
  const endpoint = text(options.endpoint ?? 'http://localhost:6006');
  const { applicationEndpoint, tracesEndpoint, url } = phoenixEndpoints(endpoint);
  const isLocal = localHost(url.hostname);
  if (!isLocal && options.allowRemote !== true) {
    throw new Error('Remote Phoenix endpoint requires allowRemote=true; self-hosted localhost is the default core mode.');
  }
  const projectName = text(options.projectName ?? 'rag-artisys');
  const headers = { 'x-project-name': projectName };
  if (options.apiKey) headers.authorization = `Bearer ${text(options.apiKey)}`;
  return {
    provider: 'phoenix',
    mode: isLocal ? 'self-hosted' : 'remote-explicit',
    applicationEndpoint,
    tracesEndpoint,
    projectName,
    serviceName: text(options.serviceName ?? 'rag-artisys-repos'),
    headers,
    requiredPaidServices: [],
  };
}

export function buildPhoenixEnvironment(options = {}) {
  const config = createPhoenixConfig(options);
  const headers = Object.entries(config.headers).map(([key, value]) => `${key}=${value}`).join(',');
  return {
    PHOENIX_COLLECTOR_ENDPOINT: config.applicationEndpoint,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: config.tracesEndpoint,
    OTEL_EXPORTER_OTLP_HEADERS: headers,
    OTEL_SERVICE_NAME: config.serviceName,
  };
}

export function createOpenInferenceExporter(options = {}) {
  const sink = options.sink;
  if (typeof sink !== 'function' && typeof sink?.export !== 'function') throw new TypeError('sink must be a function or expose export');
  return {
    async export(trace) {
      const payload = toOpenInferenceTrace(trace, options);
      if (typeof sink === 'function') await sink(payload);
      else await sink.export(payload);
      return payload;
    },
  };
}
