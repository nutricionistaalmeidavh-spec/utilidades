# ArtiSys Workflows

Reusable graph/workflow boundary for ArtiSys products. Product code works against one portable `{ nodes, edges }` contract instead of coupling domain logic to XYFlow, LogicFlow or Rete.js.

## What it gives the consumer

- validate workflows and reject duplicates/dangling edges;
- detect cycles and compute deterministic dependency order;
- execute a directed acyclic workflow with async handlers;
- pass predecessor outputs to downstream nodes;
- translate portable graphs to/from XYFlow and LogicFlow;
- translate portable graphs to/from a Rete-friendly node/connection shape;
- CLI for validation and dependency order.

## Example

```js
import { executeWorkflow } from '@artisys/workflows';

const result = await executeWorkflow(workflow, {
  task: async ({ node, inputs, context }) => context.runTask(node, inputs),
  approval: async ({ inputs }) => inputs.every(Boolean),
});
```

## Editor boundary

Use XYFlow for polished React node editors, LogicFlow for business diagrams and Rete.js for visual programming. The consumer can change editor without migrating the workflow domain model.

No server, daemon or paid service is required.
