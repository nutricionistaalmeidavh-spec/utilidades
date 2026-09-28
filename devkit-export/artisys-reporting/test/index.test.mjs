import test from'node:test';import assert from'node:assert/strict';import{groupBy,aggregate,toCsv}from'../src/index.mjs';
test('groups aggregates and exports',()=>{const rows=[{c:'a',v:2},{c:'a',v:3}];assert.equal(groupBy(rows,'c').a.length,2);assert.equal(aggregate(rows,'v','sum'),5);assert.match(toCsv(rows),/^c,v/) });
