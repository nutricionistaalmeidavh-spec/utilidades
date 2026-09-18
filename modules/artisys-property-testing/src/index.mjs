function requireFastCheck(fc) {
  if (!fc || typeof fc.property !== 'function' || typeof fc.assert !== 'function') {
    throw new TypeError('fast-check instance is required');
  }
  return fc;
}

export function createCollectionArbitraries(input, options = {}) {
  const fc = requireFastCheck(input);
  const maxItems = Math.max(0, Number(options.maxItems ?? 100));
  const maxDescriptionLength = Math.max(0, Number(options.maxDescriptionLength ?? 500));
  const status = fc.constantFrom('stable', 'implemented');
  const module = fc.record({
    id: fc.uuid(),
    status,
    name: fc.string({ minLength: 0, maxLength: 80 }),
    description: fc.string({ minLength: 0, maxLength: maxDescriptionLength }),
  });
  const modules = fc.array(module, { minLength: 0, maxLength: maxItems });
  const idlessItem = fc.record({
    name: fc.string({ minLength: 0, maxLength: 80 }),
    status,
  });
  return { status, module, modules, idlessItem, idlessItems: fc.array(idlessItem, { maxLength: maxItems }) };
}

export function assertCollectionProperties(options = {}) {
  const fc = requireFastCheck(options.fc);
  const summarizeCollection = options.summarizeCollection;
  if (typeof summarizeCollection !== 'function') throw new TypeError('summarizeCollection function is required');
  const numRuns = Math.max(1, Number(options.numRuns ?? 100));
  const arbitraries = createCollectionArbitraries(fc, options);
  const properties = [];

  const run = (name, property) => {
    fc.assert(property, { numRuns });
    properties.push(name);
  };

  run('order-invariance', fc.property(arbitraries.modules, items => {
    const a = summarizeCollection(items);
    const b = summarizeCollection([...items].reverse());
    return a.total === b.total
      && (a.aggregates?.status?.stable ?? 0) === (b.aggregates?.status?.stable ?? 0)
      && (a.aggregates?.status?.implemented ?? 0) === (b.aggregates?.status?.implemented ?? 0);
  }));

  run('duplicate-id-invariance', fc.property(arbitraries.module, arbitraries.modules, (item, rest) => {
    const original = [item, ...rest];
    const duplicated = [...original, { ...item }];
    return summarizeCollection(original).total === summarizeCollection(duplicated).total;
  }));

  run('exclusive-group-sum', fc.property(arbitraries.modules, items => {
    const summary = summarizeCollection(items);
    const status = summary.aggregates?.status ?? {};
    return (status.stable ?? 0) + (status.implemented ?? 0) === summary.total;
  }));

  run('truncation-preserves-total', fc.property(arbitraries.modules, fc.nat({ max: Math.max(1, Number(options.maxItems ?? 100)) }), (items, limit) => {
    const full = summarizeCollection(items);
    const limited = summarizeCollection(items, { itemLimit: limit });
    return full.total === limited.total && full.uniqueTotal === limited.uniqueTotal;
  }));

  run('idless-items-physical-count', fc.property(arbitraries.idlessItems, items => summarizeCollection(items).total === items.length));

  run('description-size-does-not-change-total', fc.property(arbitraries.modules, items => {
    const expanded = items.map(item => ({ ...item, description: `${item.description}${'x'.repeat(200)}` }));
    return summarizeCollection(items).total === summarizeCollection(expanded).total;
  }));

  return { ok: true, numRuns, properties };
}
