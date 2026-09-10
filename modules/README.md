# Módulos ArtiSys reutilizáveis

Esta pasta contém integrações nossas construídas sobre os upstreams aprovados em `projects/`.

## Princípio

Um sistema consumidor não deve conhecer detalhes do upstream quando isso puder ser evitado. Ele consome um contrato ArtiSys estável e o módulo decide como conversar com a biblioteca, CLI ou serviço externo.

## Modos

| Modo | Uso |
|---|---|
| `shared` | Código/configuração comum que deve acompanhar a versão central. |
| `snapshot` | Base copiada uma vez e customizada no projeto consumidor. |
| `service` | Serviço externo isolado; o consumidor recebe apenas adapter/configuração. |

## Estrutura mínima de um módulo

```text
modules/<id>/
├─ module.json
└─ README.md
```

Quando o módulo amadurecer, pode adicionar `src/`, `contracts/`, `templates/`, `tests/` e `examples/` sem mudar sua identidade no catálogo.

## Regra de cópia

Nunca copiar diretamente `projects/<upstream>` para um sistema ArtiSys. O ponto de reutilização é sempre `modules/<id>` ou uma fronteira de serviço declarada pelo módulo.

## Módulos iniciais

1. `artisys-qa`
2. `artisys-security`
3. `artisys-documents`
4. `artisys-authz`
5. `artisys-optimizer`
6. `artisys-api-contracts`
7. `artisys-ai-quality`
8. `artisys-privacy`
9. `artisys-bim`
