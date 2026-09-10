import { createValidator, readJson } from '../src/index.mjs';
import { startExampleProvider } from './pos-provider.mjs';

const provider = await startExampleProvider();
try {
  const response = await fetch(`${provider.url}/sales/demo-sale`);
  if (response.status !== 200) throw new Error('Expected HTTP 200');
  createValidator(readJson(new URL('./sale.schema.json', import.meta.url)))(await response.json());
  console.log('Real local HTTP response conforms to the example sale schema');
} finally { await provider.close(); }
