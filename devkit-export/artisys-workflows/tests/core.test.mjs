import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateWorkflow,
  topologicalOrder,
  executeWorkflow,
  fromXYFlow,
  toXYFlow,
  fromLogicFlow,
  toLogicFlow,
  fromRete,
  toRete,
} from '../src/index.mjs';

const graph = {
  id: 'approval',
  nodes: [
    { id: 'start', type: 'input', data: { value: 2 } },
    { id: 'double', type: 'double', data: {} },
    { id: 'finish', type: 'output', data: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'double' },
    { id: 'e2', source: 'double', target: 'finish' },
  ],
};

test('validateWorkflow rejects edges that reference missing nodes', () => {
  assert.throws(() => validateWorkflow({ nodes: [{ id: 'a', type: 'x' }], edges: [{ source: 'a', target: 'b' }] }), /missing node b/);
});

test('topologicalOrder returns deterministic dependency order', () => {
  assert.deepEqual(topologicalOrder(graph), ['start', 'double', 'finish']);
});

test('topologicalOrder rejects cycles', () => {
  assert.throws(() => topologicalOrder({ nodes: [{ id: 'a', type: 'x' }, { id: 'b', type: 'x' }], edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }] }), /cycle/i);
});

test('executeWorkflow passes predecessor outputs to handlers', async () => {
  const result = await executeWorkflow(graph, {
    input: ({ node }) => node.data.value,
    double: ({ inputs }) => inputs[0] * 2,
    output: ({ inputs }) => inputs[0],
  });
  assert.deepEqual(result.order, ['start', 'double', 'finish']);
  assert.equal(result.outputs.finish, 4);
});

test('fromXYFlow and toXYFlow preserve portable graph data', () => {
  const portable = fromXYFlow({
    nodes: [{ id: 'n1', type: 'task', position: { x: 10, y: 20 }, data: { label: 'Task' } }],
    edges: [{ id: 'e1', source: 'n1', target: 'n2', data: { condition: 'ok' } }, { id: 'e2', source: 'n2', target: 'n3' }],
  }, { allowDangling: true });
  assert.equal(portable.nodes[0].position.x, 10);
  assert.equal(toXYFlow(portable).nodes[0].data.label, 'Task');
});

test('LogicFlow adapter maps node properties and edge endpoints', () => {
  const portable = fromLogicFlow({
    nodes: [{ id: 'a', type: 'rect', x: 50, y: 60, properties: { role: 'review' }, text: { value: 'Review' } }, { id: 'b', type: 'rect', x: 70, y: 80 }],
    edges: [{ id: 'ab', sourceNodeId: 'a', targetNodeId: 'b', properties: { condition: 'yes' } }],
  });
  assert.equal(portable.nodes[0].data.label, 'Review');
  assert.equal(portable.edges[0].source, 'a');
  const back = toLogicFlow(portable);
  assert.equal(back.edges[0].targetNodeId, 'b');
});

test('Rete adapter preserves nodes and connections', () => {
  const portable = fromRete({
    nodes: [{ id: 1, type: 'source', data: { label: 'A' } }, { id: 2, type: 'sink', data: {} }],
    connections: [{ id: 'c1', source: 1, target: 2, data: { socket: 'value' } }],
  });
  assert.equal(portable.edges[0].source, '1');
  const back = toRete(portable);
  assert.equal(back.connections[0].target, '2');
  assert.equal(back.nodes[0].data.label, 'A');
});
