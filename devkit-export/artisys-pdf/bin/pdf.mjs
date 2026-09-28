#!/usr/bin/env node
import fs from 'node:fs/promises';
import { generatePdf, validatePdfTemplate } from '../src/index.mjs';

const [command, inputPath, outputPath] = process.argv.slice(2);
if (!command || !inputPath) {
  console.error('Usage: artisys-pdf <validate|generate> <input.json> [output.pdf]');
  process.exit(2);
}

const payload = JSON.parse(await fs.readFile(inputPath, 'utf8'));
if (command === 'validate') {
  validatePdfTemplate(payload.template ?? payload);
  console.log('ArtiSys PDF template valid');
} else if (command === 'generate') {
  if (!outputPath) throw new Error('generate requires output.pdf');
  let plugins = payload.plugins;
  if (!plugins) {
    try {
      const schemas = await import('@pdfme/schemas');
      const { buildPdfmePlugins } = await import('../src/index.mjs');
      plugins = buildPdfmePlugins(schemas);
    } catch {
      plugins = undefined;
    }
  }
  const bytes = await generatePdf({ template: payload.template, inputs: payload.inputs ?? [], plugins, options: payload.options });
  await fs.writeFile(outputPath, bytes);
  console.log(`Generated ${outputPath}`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
