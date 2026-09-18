import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPhoenixEnvironment,
  createOpenInferenceExporter,
  createPhoenixConfig,
  inferOpenInferenceSpanKind,
  toOpenInferenceTrace,
} from '../src/index.mjs';

function sampleTrace() {
  return {
    name: 'rag.agent.ask',
    traceId: 'trace-1',
    startedAt: '2026-09-18T12:00:00.000Z',
    endedAt: '2026-09-18T12:00:01.000Z',
    status: 'ok',
    attributes: { sessionId: 'session-1', repository: 'utilidades', authorization: 'Bearer secret' },
    spans: [
      {
        name: 'rag.agent.plan',
        spanId: 'span-plan',
        parentSpanId: null,
        startedAt: '2026-09-18T12:00:00.100Z',
        endedAt: '2026-09-18T12:00:00.300Z',
        status: 'ok',
        attributes: { round: 1, 'input.value': 'sensitive prompt' },
        events: [],
      },
      {
        name: 'rag.tool.invoke',
        spanId: 'span-tool',
        parentSpanId: 'span-plan',
        startedAt: '2026-09-18T12:00:00.400Z',
        endedAt: '2026-09-18T12:00:00.700Z',
        status: 'ok',
        attributes: { tool: 'repoutils.modules' },
        events: [{ name: 'done', at: '2026-09-18T12:00:00.650Z', attributes: { total: 61 } }],
      },
      {
        name: 'rag.answer.generate',
        spanId: 'span-answer',
        parentSpanId: null,
        startedAt: '2026-09-18T12:00:00.800Z',
        endedAt: '2026-09-18T12:00:01.000Z',
        status: 'ok',
        attributes: { model: 'gemini-3.8-flash', provider: 'gemini', 'output.value': 'Temos 61 módulos.' },
        events: [],
      },
    ],
  };
}

test('infers OpenInference span kinds for the RAG lifecycle', () => {
  assert.equal(inferOpenInferenceSpanKind('rag.agent.ask'), 'AGENT');
  assert.equal(inferOpenInferenceSpanKind('rag.tool.invoke'), 'TOOL');
  assert.equal(inferOpenInferenceSpanKind('rag.search'), 'RETRIEVER');
  assert.equal(inferOpenInferenceSpanKind('llm.generate'), 'LLM');
  assert.equal(inferOpenInferenceSpanKind('security.prompt_injection'), 'GUARDRAIL');
  assert.equal(inferOpenInferenceSpanKind('quality.evaluate'), 'EVALUATOR');
  assert.equal(inferOpenInferenceSpanKind('other.step'), 'CHAIN');
});

test('converts local trace to an OpenInference-compatible envelope and preserves hierarchy', () => {
  const output = toOpenInferenceTrace(sampleTrace(), { projectName: 'rag-artisys', serviceName: 'rag-artisys-repos' });
  assert.equal(output.schema, 'openinference-compatible/v1');
  assert.equal(output.traceId, 'trace-1');
  assert.equal(output.resource['openinference.project.name'], 'rag-artisys');
  assert.equal(output.resource['service.name'], 'rag-artisys-repos');
  assert.equal(output.spans[0].attributes['openinference.span.kind'], 'AGENT');
  const tool = output.spans.find(span => span.spanId === 'span-tool');
  assert.equal(tool.parentSpanId, 'span-plan');
  assert.equal(tool.attributes['openinference.span.kind'], 'TOOL');
  assert.equal(tool.attributes['tool.name'], 'repoutils.modules');
  assert.equal(tool.events[0].attributes.total, 61);
});

test('privacy-safe conversion strips secret attributes and content capture by default', () => {
  const output = toOpenInferenceTrace(sampleTrace());
  assert.equal(output.spans[0].attributes.authorization, undefined);
  const plan = output.spans.find(span => span.spanId === 'span-plan');
  const answer = output.spans.find(span => span.spanId === 'span-answer');
  assert.equal(plan.attributes['input.value'], undefined);
  assert.equal(answer.attributes['output.value'], undefined);
});

test('content capture must be explicitly enabled', () => {
  const output = toOpenInferenceTrace(sampleTrace(), { captureContent: true });
  const plan = output.spans.find(span => span.spanId === 'span-plan');
  const answer = output.spans.find(span => span.spanId === 'span-answer');
  assert.equal(plan.attributes['input.value'], 'sensitive prompt');
  assert.equal(answer.attributes['output.value'], 'Temos 61 módulos.');
});

test('builds a self-hosted Phoenix OTLP HTTP configuration by default', () => {
  const config = createPhoenixConfig({ projectName: 'rag-artisys' });
  assert.equal(config.mode, 'self-hosted');
  assert.equal(config.applicationEndpoint, 'http://localhost:6006');
  assert.equal(config.tracesEndpoint, 'http://localhost:6006/v1/traces');
  assert.equal(config.headers['x-project-name'], 'rag-artisys');
  assert.equal('authorization' in config.headers, false);
  assert.deepEqual(config.requiredPaidServices, []);
});

test('remote Phoenix endpoint is opt-in instead of a silent dependency', () => {
  assert.throws(() => createPhoenixConfig({ endpoint: 'https://phoenix.example.com' }), /allowRemote/i);
  const config = createPhoenixConfig({ endpoint: 'https://phoenix.example.com', allowRemote: true, apiKey: 'abc', projectName: 'rag' });
  assert.equal(config.mode, 'remote-explicit');
  assert.equal(config.tracesEndpoint, 'https://phoenix.example.com/v1/traces');
  assert.equal(config.headers.authorization, 'Bearer abc');
});

test('builds environment variables for optional Phoenix/OpenTelemetry wiring', () => {
  const env = buildPhoenixEnvironment({ projectName: 'rag-artisys', serviceName: 'rag-artisys-repos' });
  assert.equal(env.PHOENIX_COLLECTOR_ENDPOINT, 'http://localhost:6006');
  assert.equal(env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT, 'http://localhost:6006/v1/traces');
  assert.match(env.OTEL_EXPORTER_OTLP_HEADERS, /x-project-name=rag-artisys/);
  assert.equal(env.OTEL_SERVICE_NAME, 'rag-artisys-repos');
});

test('open inference exporter transforms before delivering to the injected sink', async () => {
  const received = [];
  const exporter = createOpenInferenceExporter({ sink: async payload => received.push(payload), projectName: 'rag-artisys' });
  const payload = await exporter.export(sampleTrace());
  assert.equal(received.length, 1);
  assert.equal(received[0].traceId, 'trace-1');
  assert.equal(payload, received[0]);
});
