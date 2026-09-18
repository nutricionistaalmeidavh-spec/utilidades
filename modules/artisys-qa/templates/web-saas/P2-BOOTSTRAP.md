# Bootstrap P2 — novo SaaS ArtiSys

Use este checklist para ligar um novo sistema web/SaaS ao runtime compartilhado sem duplicar a infraestrutura de QA.

1. Copie `templates/web-saas` para `qa/` do consumidor.
2. Declare `systemId`, ambientes, viewports e flows reais do produto.
3. Preserve os testes nativos do produto como checks críticos.
4. Adote `@artisys/qa/ui-sweep`, `@artisys/qa/api-sweep` e `@artisys/qa/matrix` quando aplicável.
5. Use os packs `saas`, `licensing` e `multitenancy` somente se os flows correspondentes existirem.
6. No gate final, converta cada etapa em check `passed/failed` e monte o bundle com `buildProductQaSummary` + `writeProductQaBundle`.
7. Grave os artefatos em `qa-delivery-artifacts/` e mantenha essa pasta fora do Git.
8. Passe secrets/tokens em memória/ambiente; quando um valor sensível puder chegar ao bundle, informe-o em `secretValues` para redaction.
9. Produção deve permanecer read-only por padrão. Mutações exigem opt-in explícito e dados sintéticos identificáveis.
10. Só promova a versão do runtime para o canal `stable` depois da validação local do consumidor.

Bundle mínimo esperado:

```text
qa-delivery-artifacts/
└── <sistema>-<run>/
    ├── QA-SUMMARY.json
    ├── QA-SUMMARY.txt
    ├── report.html
    ├── coverage.json
    ├── endpoints.json
    ├── console-errors.json
    ├── network-errors.json
    ├── findings.json
    └── evidence.json
```
