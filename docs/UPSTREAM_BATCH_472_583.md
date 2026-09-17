# Upstreams incorporados — seleções 472–583

Este lote registra de forma permanente os repositórios aprovados nas seleções 472–583.

## Regra do core

- Core: R$ 0, self-hosted e open source.
- Serviço pago é somente opcional e explícito.
- Nenhum servidor, daemon, API ou plataforma deste lote vira dependência obrigatória de runtime apenas por estar incorporado ao catálogo.
- Upstreams pesados, aplicações completas e serviços são consumidos por adapter, processo local sob demanda ou referência arquitetural.
- Vendoring, linking ou cópia de código exige auditoria de licença específica do upstream antes da reutilização.

## Segurança e cadeia de suprimentos

| Seleção | Upstream | Uso no RepoUteis |
|---:|---|---|
| 472 | trufflesecurity/trufflehog | Detecção de secrets no fluxo de segurança |
| 473 | anchore/grype | Scanner de vulnerabilidades |
| 475 | DependencyTrack/dependency-track | Rastreamento de dependências, riscos e SBOM |
| 476 | CycloneDX/cyclonedx-cli | Geração, validação e manipulação de SBOM |
| 478 | PyCQA/bandit | Análise de segurança para Python |
| 479 | semgrep/semgrep | Já incorporado como submódulo; mantido sem duplicação |

## Mapas

| Seleção | Upstream | Uso no RepoUteis |
|---:|---|---|
| 500 | maplibre/maplibre-gl-js | Base para `artisys-maps`, mapas interativos sem Google Maps obrigatório |

## IA, RAG e runtime de modelos

| Seleção | Upstream | Uso no RepoUteis |
|---:|---|---|
| 511 | vllm-project/vllm | Runtime local de inferência LLM |
| 512 | BerriAI/litellm | Gateway multi-modelo; provedores externos continuam opcionais |
| 513 | stanfordnlp/dspy | Programação e otimização de pipelines LLM |
| 514 | deepset-ai/haystack | Pipelines RAG/agentes |
| 515 | run-llama/llama_index | Indexação, recuperação e conectores RAG |

A arquitetura prevista mantém as responsabilidades separadas: runtime, gateway, programação/otimização e RAG. Isso evita acoplamento a um único provedor ou framework.

## Ferramentas para repositórios

| Seleção | Upstream | Uso no RepoUteis |
|---:|---|---|
| 530 | nrwl/nx | Orquestração de monorepos e tarefas |
| 537 | BurntSushi/ripgrep | Busca rápida em código e arquivos |
| 538 | junegunn/fzf | Seleção fuzzy interativa em ferramentas locais |

Essas ferramentas são de desenvolvimento e não entram no runtime dos sistemas vendidos.

## Dados e analytics

| Seleção | Upstream | Uso no RepoUteis |
|---:|---|---|
| 555 | apache/arrow | Formato/memória columnar e interoperabilidade de dados |
| 556 | apache/datafusion | Motor SQL/consulta embutível |
| 557 | apache/iceberg | Referência para tabelas grandes versionadas e arquitetura de data lake |

## Infraestrutura e suporte

| Seleção | Upstream | Uso no RepoUteis |
|---:|---|---|
| 565 | netbirdio/netbird | Rede privada self-hosted opcional |
| 568 | LizardByte/Sunshine | Streaming/acesso remoto local sob demanda |
| 569 | go-gitea/gitea | Forge Git self-hosted opcional |
| 583 | photoprism/photoprism | Referência para biblioteca, indexação e busca de mídia |

## Fonte canônica do lote

Os commits fixados, classes de runtime, capacidades e módulos de destino estão em:

`catalog/incorporated-repos-2026-09-16-batch2.json`

Essa lista é aditiva aos catálogos anteriores. O Semgrep aparece no lote para preservar a seleção do usuário, mas continua com a incorporação existente em `projects/security/semgrep` e não é duplicado.
