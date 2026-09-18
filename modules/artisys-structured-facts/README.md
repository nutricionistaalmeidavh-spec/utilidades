# ArtiSys Structured Facts

Deterministic collection facts for agents and applications. The module computes totals, deduplicated totals, grouped counts and simple aggregate answers in code so an LLM never has to count a truncated list.

## Core API

```js
import {
  summarizeCollection,
  countBy,
  resolveAggregateQuestion,
} from '@artisys/structured-facts';

const summary = summarizeCollection(modules, { itemLimit: 20 });
// summary.total remains exact even when summary.items is truncated.

const answer = resolveAggregateQuestion('Quantos módulos temos?', summary);
// { resolved: true, value: 61, answer: 'Temos 61 módulos.', ... }
```

## Guarantees

- no model/provider dependency;
- no paid service;
- collection metadata is computed before payload truncation;
- duplicate IDs do not inflate logical totals;
- items without IDs remain distinct;
- status/group aggregates are deterministic.

Core license cost: R$ 0.
