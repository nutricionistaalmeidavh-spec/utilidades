import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePage, toGrapesJsProject, toPuckData, toCraftElementTree } from '../src/index.mjs';

const page = { id: 'home', title: 'Home', blocks: [
  { id: 'hero', type: 'container', props: { className: 'hero' }, children: [
    { id: 'title', type: 'heading', props: { text: 'Olá', level: 1 }, children: [] },
    { id: 'cta', type: 'button', props: { text: 'Começar', href: '#start' }, children: [] }
  ] }
] };

test('validates a portable page tree and duplicate block ids', () => {
  assert.equal(validatePage(page).id, 'home');
  assert.throws(() => validatePage({ id: 'x', title: 'X', blocks: [{ id: 'a', type: 'text', props: {}, children: [] }, { id: 'a', type: 'text', props: {}, children: [] }] }), /duplicate/);
});

test('adapts page to GrapesJS project data', () => {
  const result = toGrapesJsProject(page);
  assert.equal(result.pages[0].id, 'home');
  assert.equal(result.pages[0].component[0].type, 'container');
});

test('adapts page to Puck data and Craft element tree', () => {
  const puck = toPuckData(page);
  assert.equal(puck.content[0].type, 'container');
  assert.equal(puck.content[0].props.id, 'hero');
  const craft = toCraftElementTree(page);
  assert.equal(craft[0].id, 'hero');
  assert.equal(craft[0].children[0].id, 'title');
});
