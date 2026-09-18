# Módulos reutilizáveis para RAG, agentes e qualidade de IA

Este conjunto concentra proteções reutilizáveis para consultas factuais, testes e observabilidade de agentes.

| Módulo | Papel |
|---|---|
| `artisys-structured-facts` | Calcula totais, agrupamentos e respostas agregadas determinísticas antes da LLM. |
| `artisys-property-testing` | Gera propriedades e casos para combinações de ordenação, duplicatas, truncamento e grandes coleções. |
| `artisys-mutation-testing` | Mede se a suíte realmente detecta alterações incorretas em lógica crítica. |
| `artisys-ai-quality` | Regressões factuais, Promptfoo opcional e handoff data-only para Ragas/DeepEval. |
| `artisys-ai-observability` | Traces compatíveis com convenções OpenInference, privacidade por padrão e Phoenix self-hosted opcional. |

## Catálogo

As entradas desta entrega ficam em `catalog/modules-rag-quality-p1.json` e `catalog/module-display.pt-BR-rag-quality-p1.json`.

O loader e o verificador central aplicam a política `id-last-write-wins`: o catálogo base é carregado primeiro e extensões `modules-*.json` / `module-display.pt-BR-*.json` são mescladas em ordem de nome. Isso permite atualizar metadados de um módulo existente, como `artisys-ai-quality`, sem duplicar o módulo lógico.

## Política de custo

O core não depende de serviço pago. Fast-check e Stryker são ferramentas locais/CI opcionais. Phoenix pode ser self-hosted. Ragas e DeepEval são integrações opcionais executadas pelo consumidor.

## Regra de arquitetura

LLM interpreta linguagem; código calcula fatos. Totais, agrupamentos, existência e outros agregados simples devem vir de dados estruturados e não da contagem de trechos visíveis no contexto do modelo.
