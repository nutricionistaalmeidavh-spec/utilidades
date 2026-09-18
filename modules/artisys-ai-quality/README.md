# ArtiSys AI Quality

Portable AI/RAG evaluation contracts with no embedded credentials and no mandatory hosted service.

## Promptfoo boundary

```js
import { buildPromptfooConfig } from '@artisys/ai-quality';
```

The existing suite/config/summary/adapter API remains compatible.

## Deterministic factual regression

```js
import {
  buildCollectionRegressionCase,
  evaluateFactRegression,
} from '@artisys/ai-quality';

const testCase = buildCollectionRegressionCase({
  id: 'repoutils-module-count',
  question: 'Quantos módulos temos?',
  expectedTotal: 61,
  forbiddenTotals: [14],
  requireDeterministic: true,
});

const result = evaluateFactRegression(testCase, {
  answer: 'Temos 61 módulos.',
  provider: 'deterministic',
  aggregates: { total: 61 },
});
```

The factual helpers verify required facts, forbidden claims, exact aggregate values, complete-evidence requirements and deterministic provenance. They do not call a model.

## Optional Ragas and DeepEval handoff

The module can emit data shaped for external evaluators without importing them or making them runtime dependencies:

```js
import {
  buildRagasSamples,
  buildDeepEvalTestCases,
  buildExternalEvaluationBundle,
} from '@artisys/ai-quality';

const ragasSamples = buildRagasSamples(dataset.cases, results);
const deepEvalCases = buildDeepEvalTestCases(dataset.cases, results);
const bundle = buildExternalEvaluationBundle(dataset.cases, results);
```

Ragas receives `user_input`, `retrieved_contexts`, `response`, `reference` and `reference_contexts`. DeepEval receives `input`, `actual_output`, `expected_output`, `context`, `retrieval_context` and the agent tools executed when available.

These are data-only adapters. Installing or running Ragas/DeepEval is optional and remains in the consumer environment.

## Cost policy

Core license/service cost: R$ 0. Promptfoo, Ragas, DeepEval and model-provider execution are optional; no hosted platform is required by this module.
