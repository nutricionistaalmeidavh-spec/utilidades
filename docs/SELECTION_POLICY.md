# Politica de selecao de repositorios uteis

Este repositorio nao e um catalogo geral de open source. Um upstream novo so pode ser apresentado como sugestao para incorporacao depois de passar por esta triagem.

## Requisitos obrigatorios

1. O core precisa ser R$ 0 e utilizavel sem assinatura comercial obrigatoria.
2. Precisa ser open source com licenca compativel com o modo de uso proposto.
3. Nao pode exigir servidor, daemon, VPS, PC dedicado ou runner self-hosted permanentemente ligado.
4. Deve executar como `embedded`, `local-on-demand`, `ci` ou `dev-tool`.
5. Deve entregar uma capacidade de produto concreta e diferenciada. Bibliotecas genericas de banco, estado, validacao, ORM, HTTP, utilitarios ou funcoes triviais nao entram apenas por serem boas bibliotecas.
6. A utilidade precisa ser aplicavel a pelo menos um produto ArtiSys atual ou planejado.
7. Se houver plano cloud, API paga ou servico comercial, ele deve ser opcional e substituivel; o core aprovado nao pode depender dele.
8. Antes de apresentar uma lista ao usuario, cada candidato deve ser verificado contra estes criterios.

## Sinais de rejeicao

- produto completo que so e util quando hospedado como servico proprio;
- dependencia always-on;
- funcionalidade que ja existe de forma trivial no stack e nao adiciona uma capacidade nova;
- licenca source-available/comercial tratada como se fosse open source;
- repo interessante apenas para o mantenedor, sem caminho pratico de consumo em produto ArtiSys.

## Preferencias

Priorizar componentes que adicionem capacidades visiveis como editores, canvases, cronogramas, arvores/gerenciadores, anotacao, captura, visualizacao, scanners, assinatura, upload, diagramas, timeline, planejamento, interacoes avancadas e ferramentas de produto equivalentes.
