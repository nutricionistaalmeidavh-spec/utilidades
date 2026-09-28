#!/usr/bin/env node
import fs from 'node:fs/promises';
import { topologicalOrder, validateWorkflow } from '../src/index.mjs';

const [command, inputPath] = process.argv.slice(2);
if (!command || !inputPath) {
  console.error('Usage: artisys-workflows <validate|order> <workflow.json>');
  process.exit(2);
}
const workflow = JSON.parse(await fs.readFile(inputPath, 'utf8'));
if (command === 'validate') {
  validateWorkflow(workflow);
  console.log('ArtiSys workflow valid');
} else if (command === 'order') {
  console.log(JSON.stringify(topologicalOrder(workflow)));
} else {
  throw new Error(`Unknown command: ${command}`);
}
