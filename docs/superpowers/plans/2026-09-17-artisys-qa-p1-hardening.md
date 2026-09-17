# ArtiSys QA P1 — Hardening Implementation Plan

**Goal:** aprofundar o P0 com matriz de viewport, segurança negativa e validação cross-system real da Loja Online.

## Task 1 — Runtime compartilhado

- criar `src/matrix.js`;
- testar produto cartesiano e fail-fast;
- exportar como `@artisys/qa/matrix`;
- documentar uso para SaaS web.

## Task 2 — Loja Online

- adicionar `qa:p1:deep`, `qa:p1:matrix` e `qa:p1`;
- testar URLs inválidas, sanitização/XSS, isolamento, licença bloqueada e PWA;
- executar smoke em desktop/tablet/mobile;
- incluir P1 no gate `qa:release`.

## Task 3 — Central Artisys

- adicionar matriz owner desktop/tablet/mobile;
- executar baseline P1 de segurança, adapter Loja Online e contratos owner;
- garantir que segredo nunca aparece no frontend;
- incluir P1 no `qa:release`.

## Task 4 — Cross-system P1

- negar secret inválido;
- criar tenant QA;
- autenticar com senha temporária apenas em memória;
- configurar catálogo QA;
- confirmar catálogo público ativo;
- bloquear licença e confirmar catálogo 403;
- desbloquear e confirmar restauração;
- validar auditoria;
- nunca serializar senha, token ou secret.

## Task 5 — Verificação

- `utilidades/modules/artisys-qa: npm test`;
- Loja: `npm run qa:p1` e `npm run qa:release`;
- Central: `npm run qa:p1`, `npm run qa:cross-system` e `npm run qa:release`;
- revisar artefatos por vazamento de credenciais.
