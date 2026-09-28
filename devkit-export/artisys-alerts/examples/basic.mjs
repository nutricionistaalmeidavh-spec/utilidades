import { createAlert, listDueAlerts } from '../src/index.mjs';
const alert=createAlert({id:'maintenance-1',entityRef:{kind:'machine',id:'tractor-01'},title:'Manutenção preventiva vencida',dueAt:'2026-09-13T12:00:00Z',severity:'warning'});
console.log(listDueAlerts([alert],{now:'2026-09-14T12:00:00Z'}));
