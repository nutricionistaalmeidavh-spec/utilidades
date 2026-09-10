import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDashboardLayout, toReactGridLayout, toResizablePanels, toGlideColumns } from '../src/index.mjs';

const layout = [{ id: 'sales', x: 0, y: 0, w: 4, h: 2, minW: 2 }];

test('validates dashboard layout and rejects duplicate ids', () => {
  assert.deepEqual(validateDashboardLayout(layout), layout);
  assert.throws(() => validateDashboardLayout([...layout, {...layout[0]}]), /duplicate/);
});

test('adapts portable cards to react-grid-layout', () => {
  assert.deepEqual(toReactGridLayout(layout), [{ i: 'sales', x: 0, y: 0, w: 4, h: 2, minW: 2 }]);
});

test('adapts panel descriptors for resizable panels', () => {
  assert.deepEqual(toResizablePanels([{ id: 'left', size: 30, minSize: 20 }]), [{ id: 'left', defaultSize: 30, minSize: 20 }]);
});

test('adapts data columns for Glide Data Grid', () => {
  assert.deepEqual(toGlideColumns([{ id: 'name', title: 'Nome', width: 180 }]), [{ id: 'name', title: 'Nome', width: 180 }]);
});
