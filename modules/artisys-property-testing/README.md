# ArtiSys Property Testing

Reusable property-based testing helpers for ArtiSys modules and products.

The module keeps `fast-check` in the local test toolchain. Production code does not depend on a hosted evaluator or paid service.

```js
import fc from 'fast-check';
import { assertCollectionProperties } from '@artisys/property-testing';
import { summarizeCollection } from '@artisys/structured-facts';

assertCollectionProperties({ fc, summarizeCollection, numRuns: 100 });
```

The built-in collection properties cover ordering, duplicate IDs, grouped totals, truncation-safe metadata, idless items and long payloads.

Core license cost: R$ 0.
