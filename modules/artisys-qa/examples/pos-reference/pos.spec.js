import { test, expect } from '../../src/fixtures.js';

test('two isolated terminals compete for final stock; cancel and reconcile cash', async ({ terminals, request }) => {
  expect((await request.post('/cash/open', { data: { openingCents: 5000 } })).status()).toBe(201);
  const [first, second] = terminals;
  await Promise.all(terminals.map(t => t.page.goto('/')));
  await first.context.addCookies([{ name: 'terminal', value: 'first', url: 'http://127.0.0.1:4179' }]);
  expect(await second.context.cookies()).toEqual([]);
  await Promise.all(terminals.map(t => t.page.getByRole('button').click()));
  await Promise.all(terminals.map(t => expect(t.page.locator('output')).toHaveText(/Venda (concluída|recusada)/)));
  const results = await Promise.all(terminals.map(t => t.page.locator('output').textContent()));
  expect(results.sort()).toEqual(['Venda concluída', 'Venda recusada']);
  const state = await (await request.get('/state')).json();
  expect(state.stock).toBe(0);
  expect(state.cash.balanceCents).toBe(6000);
  expect(state.sales).toHaveLength(1);
  const data = { key: state.sales[0].key };
  expect((await request.post('/sales', { data })).status()).toBe(200);
  expect((await request.post('/sales/cancel', { data })).status()).toBe(200);
  expect((await request.post('/sales/cancel', { data })).status()).toBe(200);
  const closed = await (await request.post('/cash/close')).json();
  expect(closed).toEqual({ open: false, openingCents: 5000, balanceCents: 5000 });
  expect((await (await request.get('/state')).json()).stock).toBe(1);
  expect((await request.post('/sales', { data: { key: 'after-close' } })).status()).toBe(409);
});
