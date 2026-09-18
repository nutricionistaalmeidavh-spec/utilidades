# ArtiSys AI Observability

Camada reutilizável e local-first para observabilidade de agentes e aplicações com IA.

## Objetivos

- normalizar traces internos para um envelope compatível com as convenções do OpenInference;
- preservar hierarquia de spans e mapear operações de agente, LLM, ferramenta, retrieval, guardrail e avaliação;
- manter captura de conteúdo de prompt/resposta desativada por padrão;
- remover atributos com nomes de segredo/token/senha/autorização;
- gerar configuração para Phoenix self-hosted e OTLP HTTP sem tornar Phoenix obrigatório;
- permitir exportação para qualquer sink injetado pelo consumidor.

## Uso básico

```js
import { toOpenInferenceTrace } from '@artisys/ai-observability';

const normalized = toOpenInferenceTrace(trace, {
  projectName: 'rag-artisys',
  serviceName: 'rag-artisys-repos',
});
```

## Phoenix local opcional

```js
import { createPhoenixConfig, buildPhoenixEnvironment } from '@artisys/ai-observability';

const config = createPhoenixConfig({ projectName: 'rag-artisys' });
const env = buildPhoenixEnvironment({ projectName: 'rag-artisys' });
```

O padrão é `http://localhost:6006`, com OTLP HTTP em `/v1/traces`. Endpoints remotos exigem `allowRemote: true` explicitamente. Nenhuma API key, conta hospedada ou serviço pago é necessário para o core.

## Privacidade

`captureContent` é `false` por padrão. Para incluir atributos OpenInference como `input.value` e `output.value`, o consumidor precisa habilitar explicitamente:

```js
const normalized = toOpenInferenceTrace(trace, { captureContent: true });
```

## OpenTelemetry / OpenInference

O módulo não força dependências de runtime. O consumidor pode instalar e configurar os SDKs oficiais de OpenTelemetry/OpenInference ou o pacote Phoenix que preferir e usar `createOpenInferenceExporter` como boundary para o sink.

## Política de custo

Core: R$ 0, execução local/self-hosted e sem serviço pago obrigatório. Integrações hospedadas são opcionais e explícitas.
