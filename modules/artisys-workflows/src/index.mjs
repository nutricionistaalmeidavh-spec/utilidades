function asArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value;
}

function cloneData(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

export function validateWorkflow(workflow, { allowDangling = false } = {}) {
  if (!workflow || typeof workflow !== 'object') throw new TypeError('workflow must be an object');
  const nodes = asArray(workflow.nodes, 'workflow.nodes');
  const edges = asArray(workflow.edges, 'workflow.edges');
  const ids = new Set();
  for (const node of nodes) {
    if (!node?.id || typeof node.id !== 'string') throw new TypeError('each workflow node requires a string id');
    if (!node.type || typeof node.type !== 'string') throw new TypeError(`node ${node.id} requires a type`);
    if (ids.has(node.id)) throw new TypeError(`duplicate node id ${node.id}`);
    ids.add(node.id);
  }
  const edgeIds = new Set();
  for (const edge of edges) {
    if (!edge?.source || !edge?.target) throw new TypeError('each workflow edge requires source and target');
    if (!allowDangling && !ids.has(edge.source)) throw new TypeError(`edge references missing node ${edge.source}`);
    if (!allowDangling && !ids.has(edge.target)) throw new TypeError(`edge references missing node ${edge.target}`);
    if (edge.id) {
      if (edgeIds.has(edge.id)) throw new TypeError(`duplicate edge id ${edge.id}`);
      edgeIds.add(edge.id);
    }
  }
  return workflow;
}

export function topologicalOrder(workflow) {
  validateWorkflow(workflow);
  const nodeIds = workflow.nodes.map((node) => node.id);
  const indegree = new Map(nodeIds.map((id) => [id, 0]));
  const outgoing = new Map(nodeIds.map((id) => [id, []]));
  for (const edge of workflow.edges) {
    indegree.set(edge.target, indegree.get(edge.target) + 1);
    outgoing.get(edge.source).push(edge.target);
  }
  const queue = nodeIds.filter((id) => indegree.get(id) === 0);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const target of outgoing.get(id)) {
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  if (order.length !== nodeIds.length) throw new Error('workflow contains a cycle');
  return order;
}

export async function executeWorkflow(workflow, handlers, context = {}) {
  if (!handlers || typeof handlers !== 'object') throw new TypeError('handlers must be an object');
  const order = topologicalOrder(workflow);
  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const incoming = new Map(workflow.nodes.map((node) => [node.id, []]));
  for (const edge of workflow.edges) incoming.get(edge.target).push(edge.source);
  const outputs = {};
  for (const id of order) {
    const node = nodesById.get(id);
    const handler = handlers[node.type];
    if (typeof handler !== 'function') throw new Error(`missing handler for node type ${node.type}`);
    const inputIds = incoming.get(id);
    outputs[id] = await handler({
      node,
      inputs: inputIds.map((sourceId) => outputs[sourceId]),
      inputMap: Object.fromEntries(inputIds.map((sourceId) => [sourceId, outputs[sourceId]])),
      outputs,
      context,
      workflow,
    });
  }
  return { order, outputs };
}

export function fromXYFlow(graph, options = {}) {
  const workflow = {
    id: graph.id,
    nodes: asArray(graph.nodes, 'graph.nodes').map((node) => ({
      id: node.id,
      type: node.type ?? 'default',
      data: cloneData(node.data),
      position: node.position ? { x: node.position.x, y: node.position.y } : undefined,
    })),
    edges: asArray(graph.edges, 'graph.edges').map((edge, index) => ({
      id: edge.id ?? `edge-${index + 1}`,
      source: edge.source,
      target: edge.target,
      data: cloneData(edge.data),
    })),
  };
  validateWorkflow(workflow, options);
  return workflow;
}

export function toXYFlow(workflow) {
  validateWorkflow(workflow, { allowDangling: true });
  return {
    nodes: workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      data: cloneData(node.data),
      ...(node.position ? { position: { ...node.position } } : {}),
    })),
    edges: workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: cloneData(edge.data),
    })),
  };
}

export function fromLogicFlow(graph, options = {}) {
  const workflow = {
    id: graph.id,
    nodes: asArray(graph.nodes, 'graph.nodes').map((node) => ({
      id: node.id,
      type: node.type ?? 'rect',
      data: {
        ...cloneData(node.properties),
        ...(node.text?.value != null ? { label: node.text.value } : {}),
      },
      position: Number.isFinite(node.x) && Number.isFinite(node.y) ? { x: node.x, y: node.y } : undefined,
    })),
    edges: asArray(graph.edges, 'graph.edges').map((edge, index) => ({
      id: edge.id ?? `edge-${index + 1}`,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      data: cloneData(edge.properties),
    })),
  };
  validateWorkflow(workflow, options);
  return workflow;
}

export function toLogicFlow(workflow) {
  validateWorkflow(workflow, { allowDangling: true });
  return {
    nodes: workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      ...(node.position ? { x: node.position.x, y: node.position.y } : {}),
      properties: Object.fromEntries(Object.entries(cloneData(node.data)).filter(([key]) => key !== 'label')),
      ...(node.data?.label != null ? { text: { value: node.data.label } } : {}),
    })),
    edges: workflow.edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      properties: cloneData(edge.data),
    })),
  };
}

export function fromRete({ nodes = [], connections = [] }, options = {}) {
  const workflow = {
    nodes: nodes.map((node) => ({ id: String(node.id), type: node.type ?? node.label ?? 'node', data: cloneData(node.data) })),
    edges: connections.map((connection, index) => ({
      id: String(connection.id ?? `edge-${index + 1}`),
      source: String(connection.source),
      target: String(connection.target),
      data: cloneData(connection.data),
    })),
  };
  validateWorkflow(workflow, options);
  return workflow;
}

export function toRete(workflow) {
  validateWorkflow(workflow, { allowDangling: true });
  return {
    nodes: workflow.nodes.map((node) => ({ id: node.id, type: node.type, data: cloneData(node.data) })),
    connections: workflow.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, data: cloneData(edge.data) })),
  };
}
