# ArtiSys AI Quality

Portable AI/RAG evaluation contracts with no embedded credentials and no mandatory hosted service.

## Existing Promptfoo boundary

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

Core license cost: R$ 0. Promptfoo/model-provider execution remains optional and is configured by the consumer.
