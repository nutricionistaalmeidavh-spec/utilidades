# ArtiSys Modules Foundation Design

## Objetivo

Transformar `utilidades` de um catálogo de upstreams em uma fonte de verdade para upstreams **e** módulos ArtiSys reutilizáveis, sem acoplar produtos consumidores aos projetos externos.

## Arquitetura

A camada `projects/` continua imutável do ponto de vista de regra de negócio. A nova camada `modules/` contém contratos, adapters, templates e documentação ArtiSys. Cada módulo declara um modo de consumo: `shared`, `snapshot` ou `service`.

## Catálogos

- `catalog/projects.json`: upstreams, SHAs, licenças e política de consumo externa.
- `catalog/modules.json`: módulos ArtiSys, versão, maturidade, upstreams e consumidores recomendados.

## Módulos iniciais

QA, segurança, documentos, autorização, otimização, contratos de API, qualidade de IA, privacidade e BIM.

## Regras

- Nenhum módulo altera diretamente um submodule upstream.
- Nenhum secret é versionado em `utilidades`.
- Dependências copyleft/mistas permanecem atrás de fronteiras compatíveis com `docs/LICENSES.md`.
- Regras de negócio específicas ficam no consumidor.
- Adoção em produtos ocorre individualmente e deve ser verificável.

## Sucesso

A fundação está pronta quando os 9 módulos estiverem catalogados, documentados e com política explícita de consumo, e quando README/guia refletirem os 48 upstreams atuais.
