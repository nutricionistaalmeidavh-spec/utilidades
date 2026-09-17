# ArtiSys QA P1 — Hardening, Mobile e Segurança

## Objetivo

Evoluir o P0 da Loja Online + Central Artisys de smoke/navegação para validação funcional profunda, segurança negativa e matriz de viewport, sem duplicar o runtime compartilhado e sem criar bypass de autenticação.

## Escopo P1

1. Matriz reutilizável de execução em `desktop`, `tablet` e `mobile`.
2. Loja Online: cobertura profunda de Vitrine Online, variações, carrinho/pedido, estoque, multitenancy, licença bloqueada, URLs inválidas, XSS e PWA.
3. Central Artisys: regressão owner em múltiplos viewports, hardening de segredo/licenciamento e preservação das políticas P1 de segurança existentes.
4. Cross-system: além do ciclo criar/estender/bloquear/desbloquear, validar segredo inválido, login temporário, catálogo público ativo, bloqueio público e restauração.
5. Release continua fail-closed e mantém os gates nativos.

## Regras

- Não commitar secrets, cookies, senhas reais ou tokens.
- Produção read-only por padrão.
- Mutação cross-system exige `LOJAONLINE_LICENSE_SERVICE_SECRET` explícito.
- Senha temporária e sessão QA só podem existir em memória durante a execução.
- Dados mutáveis permanecem identificáveis por `QA-CROSS-`.
- Nada de endpoint QA especial em produção.

## Critério de conclusão

- helper de matriz reutilizável no `@artisys/qa`;
- Loja expõe `qa:p1` e executa hardening + matriz mobile;
- Central expõe `qa:p1` e executa segurança + matriz owner;
- cross-system valida casos positivos e negativos de licenciamento/catálogo;
- release dos dois consumidores inclui P1;
- relatórios continuam sem secrets/senhas/tokens.
