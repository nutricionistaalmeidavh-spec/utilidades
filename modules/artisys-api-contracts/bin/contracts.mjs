#!/usr/bin/env node
import { readJson, writeBaseline, assertNoDrift, createValidator, validateOpenApi, generateClient } from '../src/index.mjs';

const [command, a, b, ...rest] = process.argv.slice(2);
try {
  if (rest.length || !a) throw new Error('Invalid arguments');
  if (command === 'baseline' && b) writeBaseline(readJson(a), b);
  else if (command === 'check' && b) assertNoDrift(readJson(a), readJson(b));
  else if (command === 'validate-json' && b) createValidator(readJson(a))(readJson(b));
  else if (command === 'validate-openapi' && !b) validateOpenApi(a);
  else if (command === 'generate' && b) generateClient(a, b);
  else throw new Error('Usage: artisys-contracts baseline|check <contract.json> <baseline.json>; validate-json <schema.json> <payload.json>; validate-openapi <openapi.json>; generate <openapi.json> <output-directory>');
  console.log('Contract check completed');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
