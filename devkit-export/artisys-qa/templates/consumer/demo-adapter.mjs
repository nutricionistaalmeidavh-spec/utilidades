import { PRODUCT_FIXTURE_PACKS } from './fixtures/product-demo.mjs';

// Product adapter: replace these domain hooks with calls to your own API/database.
// Credentials arrive only through context.credentials, sourced from environment variables.
export default {
  fixturePacks: PRODUCT_FIXTURE_PACKS,

  async findDemoAccount({ credentials }) {
    // Return the existing product account, or null. Do not log credentials.
    return globalThis.__ARTISYS_DEMO_STORE__?.findAccount?.(credentials) ?? null;
  },

  async createDemoAccount({ credentials }) {
    const account = await globalThis.__ARTISYS_DEMO_STORE__?.createAccount?.(credentials);
    if (!account) throw new Error('Consumer adapter must implement demo account creation');
    return { ...account, demo: true };
  },

  async authenticateDemoAccount(context) {
    await globalThis.__ARTISYS_DEMO_STORE__?.authenticate?.(context);
  },

  async ensureDemoWorkspace(context) {
    const workspace = await globalThis.__ARTISYS_DEMO_STORE__?.ensureWorkspace?.(context);
    if (!workspace) throw new Error('Consumer adapter must resolve a demo workspace');
    return { ...workspace, demo: true };
  },

  async resetDemoWorkspace(context, policy) {
    if (context.workspace?.demo !== true) throw new Error('Refusing reset outside demo workspace');
    await globalThis.__ARTISYS_DEMO_STORE__?.resetWorkspace?.(context, policy);
  },

  async seedDemoFixtures(context, packs) {
    await globalThis.__ARTISYS_DEMO_STORE__?.seedFixtures?.(context, packs);
  },

  capabilities: {
    // Example mapping. Replace with the product's real login UI/API flow.
    'auth.login': async ({ page, runtimeContext }) => {
      const username = runtimeContext.credentials.username;
      const password = runtimeContext.credentials.password;
      await page.getByLabel(/usu[aá]rio|e-?mail/i).fill(username);
      await page.getByLabel(/senha/i).fill(password);
      await page.getByRole('button', { name: /entrar|login/i }).click();
    },
  },
};
