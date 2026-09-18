# ArtiSys QA P2 — Relatório Único, Release Gate e Packs SaaS

## Objetivo

Fechar as fases 7–9 do roadmap aprovado: relatório único por produto, release gate fail-closed de produto e consolidação das abstrações SaaS no RepoUteis.

## Escopo

1. Bundle padronizado em \`qa-delivery-artifacts/\`:
   - \`QA-SUMMARY.json\`;
   - \`QA-SUMMARY.txt\`;
   - \`report.html\`;
   - \`coverage.json\`;
   - \`endpoints.json\`;
   - \`console-errors.json\`;
   - \`network-errors.json\`;
   - \`findings.json\`.
2. Gate de produto que bloqueia release por:
   - check crítico falho;
   - finding crítico;
   - HTTP 5xx;
   - request failure;
   - console error acima da política;
   - lacuna de cobertura crítica.
3. Packs compartilhados \`saas\`, \`licensing\` e \`multitenancy\`.
4. Loja Online e Central Artisys geram o mesmo contrato de relatório e expõem \`qa:p2\`.
5. \`qa:release\` permanece fail-closed e passa por P0/P1/P2.

## Segurança

- nenhum secret, senha temporária, cookie ou token deve ser serializado no bundle;
- override exige motivo explícito;
- produção continua read-only salvo cross-system explicitamente autorizado;
- políticas específicas de negócio permanecem no consumidor.

## Promoção

A versão compartilhada P2 é 2.6.0. O canal \`stable\` só deve ser promovido depois dos testes locais dos três repositórios.
