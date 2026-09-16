# Entregas 1–4 — módulos salvos

Status: **concluídas no planejamento/arquitetura** em 2026-09-16.

Este lote transforma os novos upstreams salvos nas rodadas recentes em alvos explícitos de integração ArtiSys, sem marcar código inexistente como implementado.

## Entrega 1 — registrar upstreams salvos

Fonte canônica do lote: `catalog/saved-repos-2026-09-16.json`.

- 57 upstreams recentes registrados.
- Cada entrada contém finalidade, módulo alvo, modo de integração, risco de licença e decisão de fronteira.
- As seleções históricas 1–150 continuam registradas nos catálogos anteriores e no índice `catalog/selected-repos-2026-09-16.json`; não são duplicadas como novo lote.

## Entrega 2 — mapear repo → módulo

Fonte canônica: `catalog/planned-modules-2026-09-16.json`.

- 57 upstreams consolidados em 36 módulos-alvo.
- `artisys-pdf` e `artisys-security` são extensões de módulos existentes; não serão duplicados.
- Módulos novos permanecem com status `planned` até existir código, manifesto, README, testes e verificação.
- Aplicações completas/copy-left forte ficam atrás de `adapter`/`service`; bibliotecas permissivas podem ser `embedded` quando adequado.

## Entrega 3 — roadmap por módulo

Plano executável: `docs/superpowers/plans/2026-09-16-saved-modules-roadmap.md`.

Cada módulo tem quatro marcos obrigatórios:

1. contrato público neutro ao upstream;
2. implementação/adapters com fronteira de licença;
3. testes automatizados e simuladores/fixtures;
4. exemplo executável + documentação para integração em sistemas.

Critério comum de pronto: contrato documentado, testes, exemplo sem serviço pago obrigatório e fronteira de licença documentada.

## Entrega 4 — revisão de licença e modo de consumo

Matriz: `docs/UPSTREAM_LICENSE_REVIEW_2026-09-16.md`.

Regras:

- permissiva: pode alimentar módulo/adaptador com atribuições;
- LGPL/MPL/EPL/dual-license: fronteira explícita e revisão por componente;
- GPL/AGPL: não vendorizar no core proprietário; usar processo, serviço, firmware externo, API ou clean-room;
- licença mista/restrita: auditoria por caminho/arquivo antes de reutilizar código;
- `service` significa opção self-hosted, nunca dependência silenciosa;
- serviços pagos continuam somente opcionais e substituíveis.

## Próxima etapa

Entregas 5+ ficam fora deste lote: evolução de `artisys-release`, perfis `quick/full/release`, automação local, `act`, Woodpecker, QA pós-build, evidências e deploy.
