# @artisys/qa

Kit executável compartilhado de testes de UI Chromium e aplicações HTTP locais. Requer Node.js 22+ e Playwright 1.51–1.x. O projeto consumidor mantém regras, seletores, autenticação e cenários; o kit fornece configuração, fixtures e isolamento de terminais. Não automatiza a inicialização nativa do Electron.

## Executar este módulo

```sh
npm ci
npx playwright install chromium
npm test
npm run test:example
```

`npm test` executa testes HTTP reais sem navegador. `test:example` inicia servidor em `127.0.0.1:4179`, abre dois contextos Chromium independentes, disputa o último item, verifica uma única venda, repetição idempotente, cancelamento repetido, reposição do estoque e fechamento de caixa. O exemplo suporta uma única sessão de caixa por processo; reinicie para repetir. Nenhum servidor existente é reutilizado. Porta ocupada causa falha; libere-a antes de executar.

O servidor em `examples/pos-reference` é uma demonstração em memória, sem autenticação, persistência, pagamento ou emissão fiscal. **O resultado do exemplo não valida o PDV ArtiSys real nem concorrência entre processos/bancos de dados.** Não use esse servidor em produção. Para o PDV real, execute cenários próprios contra um servidor de teste com banco descartável e dois clientes independentes.

## Instalar em outro produto

No checkout deste módulo execute `npm pack`, copie o `.tgz` gerado para o produto e instale:

```sh
npm install --save-dev ./artisys-qa-0.2.0.tgz playwright
npx playwright install chromium
```

Não há publicação npm implícita. Também é possível usar `file:../utilidades/modules/artisys-qa`. Mantenha a versão no lockfile do consumidor; atualização do kit é uma alteração explícita de dependência.

`playwright.config.js` do consumidor:

```js
import { createQaConfig } from '@artisys/qa/config';
export default createQaConfig({
  baseURL: 'http://127.0.0.1:3000',
  testDir: './e2e',
  webServer: {
    command: 'npm run start:test',
    url: 'http://127.0.0.1:3000/health',
    reuseExistingServer: false,
  },
});
```

```js
import { test, expect } from '@artisys/qa/fixtures';

test('dois terminais', async ({ terminals }) => {
  await Promise.all(terminals.map(t => t.page.goto('/')));
  // Interaja com os seletores do produto e confira o estado persistido no servidor.
  await expect(terminals[0].page.getByRole('heading').first()).toBeVisible();
});
```

`test.use({ terminalCount: 3 })` altera o número de contextos (1–16). Os contextos não compartilham cookies nem armazenamento local. A fixture usa `baseURL`; se precisar opções adicionais por contexto ou autenticações diferentes, use `withTerminals(browser, { count, contextOptions }, callback)` de `@artisys/qa` e faça login em cada terminal. Os contextos são fechados também em falhas.

Para `authenticatedPage`, configure `test.use({ login: async page => { /* login específico do produto */ } })`. A fixture falha explicitamente quando não há callback. Para screenshots aprovadas, use a API Playwright `expect(page).toHaveScreenshot()` e mantenha baselines no produto. O kit não cria aprovação visual automática.

## Critérios e operação

- Zero falhas e zero testes exclusivos (`test.only`) em CI. Retries desabilitados para não esconder intermitência.
- Cenários com dados compartilhados devem executar em um worker ou provisionar um banco exclusivo por teste. O exemplo usa um worker e uma única sessão de caixa.
- Relatório HTML em `qa-report`, screenshots e traces de falhas em `qa-results` relativos ao arquivo de configuração. Esses arquivos podem conter dados de tela/rede: use dados sintéticos e retenção restrita no CI.
- Configure `workers`, `projects`, `use`, `reporter` e `webServer` no consumidor; `use` mescla com os padrões, outros campos substituem o padrão completo.
- Em rede local, aponte `baseURL` para o host de teste e omita `webServer` se ele for iniciado externamente. Isolamento de navegador não substitui teste de rede física, queda de energia ou transação do banco.
- `waitForHealth(url, { timeoutMs, intervalMs, signal })` espera qualquer resposta 2xx, cancela o corpo da resposta e respeita timeout/cancelamento. O endpoint de prontidão deve pertencer ao ambiente de teste.
