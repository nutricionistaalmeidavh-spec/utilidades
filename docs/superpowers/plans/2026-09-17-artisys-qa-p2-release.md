# ArtiSys QA P2 — Implementation Plan

## Task 1 — Relatório único
- criar \`product-report.js\`;
- cobrir resumo JSON/TXT/HTML;
- padronizar coverage/endpoints/console/network/findings.

## Task 2 — Release gate
- bloquear falha crítica;
- bloquear 5xx/request failure;
- bloquear console error e coverage gap conforme política;
- manter override auditável com motivo.

## Task 3 — Packs SaaS
- adicionar \`saas\`, \`licensing\` e \`multitenancy\`;
- atualizar template/documentação web SaaS.

## Task 4 — Loja Online
- agregar P1 sweep/matrix/deep em bundle P2;
- calcular cobertura funcional declarada;
- gerar gate final;
- encadear \`qa:p2\` no release.

## Task 5 — Central Artisys
- agregar segurança/sweep/matrix/cross-system em bundle P2;
- separar smoke read-only do cross-system mutável;
- gerar gate final;
- encadear \`qa:p2\` no release.

## Task 6 — Validação
- utilidades: \`npm test\`;
- Loja: \`npm run qa:p2\` e \`npm run qa:release\`;
- Central: \`npm run qa:p2\` e \`npm run qa:release\`;
- cross-system mutável apenas com secret explícito.
