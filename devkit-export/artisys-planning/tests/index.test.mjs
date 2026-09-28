import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePlan, toFrappeGantt, toFullCalendarEvents, calculateProgress, findResourceConflicts } from '../src/index.mjs';

const tasks = [
  { id: 'a', title: 'Base', start: '2026-09-10', end: '2026-09-12', progress: 50, resourceId: 'crew-1', dependencies: [] },
  { id: 'b', title: 'Tubulação', start: '2026-09-11', end: '2026-09-13', progress: 0, resourceId: 'crew-1', dependencies: ['a'] }
];

test('validates dates and dependency references', () => {
  assert.equal(validatePlan(tasks).length, 2);
  assert.throws(() => validatePlan([{ id: 'x', title: 'X', start: 'bad', end: '2026-01-01', dependencies: [] }]), /date/);
  assert.throws(() => validatePlan([{ id: 'x', title: 'X', start: '2026-01-01', end: '2026-01-02', dependencies: ['missing'] }]), /dependency/);
});

test('adapts plan to Frappe Gantt and FullCalendar', () => {
  assert.deepEqual(toFrappeGantt(tasks)[1], { id: 'b', name: 'Tubulação', start: '2026-09-11', end: '2026-09-13', progress: 0, dependencies: 'a' });
  assert.equal(toFullCalendarEvents(tasks)[0].extendedProps.resourceId, 'crew-1');
});

test('calculates average progress and resource overlaps', () => {
  assert.equal(calculateProgress(tasks), 25);
  assert.deepEqual(findResourceConflicts(tasks), [{ resourceId: 'crew-1', firstTaskId: 'a', secondTaskId: 'b' }]);
});
