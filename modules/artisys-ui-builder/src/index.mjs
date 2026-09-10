function normalizeChildren(block) {
  return block.children == null ? [] : block.children;
}

function walk(blocks, ids) {
  if (!Array.isArray(blocks)) throw new TypeError('blocks must be an array');
  return blocks.map((block) => {
    if (!block || typeof block !== 'object') throw new TypeError('block must be an object');
    if (typeof block.id !== 'string' || block.id.trim() === '') throw new TypeError('block id is required');
    if (ids.has(block.id)) throw new Error(`duplicate block id: ${block.id}`);
    ids.add(block.id);
    if (typeof block.type !== 'string' || block.type.trim() === '') throw new TypeError('block type is required');
    const props = block.props ?? {};
    if (!props || typeof props !== 'object' || Array.isArray(props)) throw new TypeError('block props must be an object');
    return { id: block.id, type: block.type, props: { ...props }, children: walk(normalizeChildren(block), ids) };
  });
}

export function validatePage(page) {
  if (!page || typeof page !== 'object') throw new TypeError('page must be an object');
  if (typeof page.id !== 'string' || page.id.trim() === '') throw new TypeError('page id is required');
  if (typeof page.title !== 'string') throw new TypeError('page title is required');
  return { id: page.id, title: page.title, blocks: walk(page.blocks ?? [], new Set()) };
}

function grapesBlock(block) {
  const attributes = { 'data-artisys-id': block.id };
  if (block.props.className) attributes.class = block.props.className;
  const component = { type: block.type, attributes, artisysProps: { ...block.props }, components: block.children.map(grapesBlock) };
  return component;
}

export function toGrapesJsProject(page) {
  const normalized = validatePage(page);
  return { pages: [{ id: normalized.id, name: normalized.title, component: normalized.blocks.map(grapesBlock) }] };
}

function puckBlock(block) {
  return { type: block.type, props: { id: block.id, ...block.props, children: block.children.map(puckBlock) } };
}

export function toPuckData(page) {
  const normalized = validatePage(page);
  return { root: { props: { title: normalized.title, pageId: normalized.id } }, content: normalized.blocks.map(puckBlock) };
}

function craftBlock(block) {
  return { id: block.id, type: block.type, props: { ...block.props }, children: block.children.map(craftBlock) };
}

export function toCraftElementTree(page) {
  return validatePage(page).blocks.map(craftBlock);
}
