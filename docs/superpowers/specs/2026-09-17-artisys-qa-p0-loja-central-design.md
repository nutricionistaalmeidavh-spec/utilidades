# ArtiSys QA P0 — Loja Online + Central Artisys

## Objetivo

Reaproveitar o módulo compartilhado `@artisys/qa` já consolidado no repositório `utilidades` para transformar Loja Online e Central Artisys em consumidores padronizados do mesmo runtime de QA, mantendo os testes nativos já existentes e adicionando uma suíte cross-system configurável.

## Escopo P0

O P0 cobre as fases 0–3 aprovadas no roadmap:

1. Base reutilizável para aplicações web com os perfis `quick`, `full` e `release`, artefatos padronizados e bootstrap do runtime compartilhado.
2. Loja Online como consumidor do `@artisys/qa`, preservando `npm run check` e `npm run qa:e2e` como gates nativos.
3. Central Artisys como consumidor do `@artisys/qa`, preservando `npm test`, `npm run build` e `npm run ux:verify` como gates nativos.
4. Suíte cross-system Central → Loja Online cobrindo o contrato de provisionamento/licenciamento sem colocar credenciais ou secrets no código.

## Arquitetura

O código genérico continua no `utilidades/modules/artisys-qa`. Cada sistema consumidor mantém apenas:

- `qa/artisys-qa.config.json`;
- flows específicos do domínio;
- um bootstrap/sync pequeno que copia a versão pinada do runtime compartilhado para `qa/runtime` quando necessário;
- scripts npm que encadeiam os gates nativos do produto com os perfis `quick`, `full` e `release`.

O runtime não será reinventado nem duplicado conceitualmente. A cópia em `qa/runtime` é um artefato de consumo pinado, seguindo o padrão já usado pelo PDV ArtiSys. O source of truth continua em `utilidades/modules/artisys-qa`.

## Ambientes

### Loja Online

- `local`: servidor self-hosted descartável em porta configurável, com base URL local.
- `production`: URL do Worker publicado, usada apenas em smoke/flows explicitamente seguros.

### Central Artisys

- `local`: `vite`/Worker local quando disponível.
- `production`: `https://artisys.dev/sistema`.

Credenciais ficam exclusivamente em variáveis de ambiente. Nenhuma senha, cookie ou `LOJAONLINE_LICENSE_SERVICE_SECRET` entra em manifests, flows ou relatórios.

## Perfis

### quick

Smoke de navegação e carregamento de superfícies críticas. Não cria dados permanentes.

### full

Executa os flows declarados do sistema e os testes nativos já existentes.

### release

Executa os gates completos do produto e falha fechado quando qualquer etapa crítica falhar.

## Artefatos

Todos os consumidores escrevem em `qa-artifacts/` e preservam o padrão do `@artisys/qa`:

- screenshots;
- trace;
- vídeo quando habilitado;
- telemetria;
- `run-summary.json`;
- relatórios HTML/JSON do profile runner.

## Loja Online — cobertura P0

Flows declarados:

- smoke;
- auth;
- clientes;
- produtos;
- estoque;
- caixa;
- vendas;
- pedidos;
- financeiro;
- vitrine;
- multitenancy;
- licenciamento.

Os fluxos de CRUD profundo que já são cobertos pelo Playwright nativo continuam sendo executados por `npm run qa:e2e`; o `@artisys/qa` adiciona a camada padronizada de navegação, captura, telemetria, relatório e composição.

## Central Artisys — cobertura P0

Flows declarados:

- owner shell;
- overview;
- Loja Online no owner;
- clientes;
- licenças;
- auditoria;
- regressão visual/navegacional básica de Obra na Mão e Débora.

Os testes de backend/build/UI contract continuam sendo executados pelos comandos nativos.

## Cross-system P0

A suíte `qa:cross-system` é um runner Node separado, sem UI de autenticação automatizada obrigatória. Ela valida o contrato operacional entre os dois produtos usando somente variáveis de ambiente e dados descartáveis:

1. valida que a Central pública responde;
2. valida que a Loja Online pública responde;
3. quando `LOJAONLINE_LICENSE_SERVICE_SECRET` estiver presente, cria um tenant QA pela API interna da Loja Online;
4. valida tenant/licença;
5. estende 6 meses;
6. bloqueia;
7. confirma bloqueio no estado da licença;
8. desbloqueia;
9. confirma restauração;
10. valida eventos de auditoria;
11. registra relatório JSON sem persistir o secret.

O runner usa um e-mail/tenant único por execução. Exclusão automática não será inventada enquanto não existir endpoint seguro de deleção de tenant; os dados QA serão identificáveis pelo prefixo `QA-CROSS-` para limpeza administrativa posterior.

A comunicação Central → Service Binding → Loja já possui testes de adapter/contrato no repositório Central. O P0 não cria bypass de autenticação no owner apenas para QA.

## Segurança

- secrets somente em `process.env`;
- relatórios nunca registram o valor de secrets;
- não criar endpoint QA especial em produção;
- não enfraquecer autenticação do owner;
- flows de produção devem ser read-only, exceto `qa:cross-system` quando secret explícito for fornecido;
- dados mutáveis usam prefixo QA e identificador único.

## Critério de conclusão do P0

- `utilidades` possui template/documentação web SaaS reutilizável;
- Loja Online expõe `qa:quick`, `qa:full`, `qa:release` e `qa:cross-system`/equivalente documentado;
- Central expõe `qa:quick`, `qa:full`, `qa:release` e o runner cross-system;
- os gates nativos existentes permanecem no release;
- nenhum secret é commitado;
- execução local produz artefatos padronizados.
