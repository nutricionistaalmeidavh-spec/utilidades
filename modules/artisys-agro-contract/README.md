# ArtiSys Agro Contract + Bridge

Contrato canônico local-first entre produtos ArtiSys Agro.

- Transporte padrão: HTTP em loopback (`127.0.0.1`), sem nuvem.
- LAN: somente quando o produto explicitamente configura outro host e mantém segredo de pareamento.
- Autorização: Bearer secret gerado no pareamento.
- Eventos: versionados e idempotentes por `eventId`.
- Identidade entre produtos: URI `artisys://produto/tipo/id`.
- Nenhum produto lê diretamente o SQLite de outro.
- O produto continua funcional sem qualquer integração instalada.

## Fluxo
Produtor -> adapter do produto -> evento v1 -> Agro Bridge -> adapter consumidor -> domínio local.

A definição canônica fica neste módulo; produtos devem manter snapshot/adapter compatível com v1 e testes de contrato.
