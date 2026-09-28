import { toFrappeGantt, toFullCalendarEvents } from '../src/index.mjs';
const tasks = [{ id: 'stage-1', title: 'Hidráulica', start: '2026-09-10', end: '2026-09-12', progress: 40, dependencies: [] }];
console.log(toFrappeGantt(tasks));
console.log(toFullCalendarEvents(tasks));
