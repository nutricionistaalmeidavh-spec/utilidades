# ArtiSys Mutation Testing

Shared StrykerJS configuration for checking whether tests really catch defects in deterministic core logic.

```js
import { buildStrykerConfig } from '@artisys/mutation-testing';

export default buildStrykerConfig({
  mutate: ['src/structured-facts.mjs'],
  testCommand: 'node --test tests/structured-facts.test.mjs',
});
```

Mutation testing is an explicit quality command and is not required on every fast local test run. It runs locally/CI and does not require a dashboard or paid service.

Core license cost: R$ 0.
