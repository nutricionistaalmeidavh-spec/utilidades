# Guia de integração das utilidades

## Objetivo

`utilidades` registra componentes open source externos aprovados, controlando origem, versão fixada, licença e forma de consumo. A integração funcional acontece no repositório consumidor através de uma fronteira local.

## Fluxo padrão

```text
Projeto consumidor
      ↓
adapter / wrapper / CLI / API
      ↓
utilidade aprovada ou serviço isolado
      ↓
upstream fixado por SHA
```

## Formas de consumo

- `adapter`: biblioteca atrás de interface local.
- `runtime-adapter`: runtime isolado atrás de interface local.
- `service-adapter`: processo/serviço externo acessado por API.
- `dev-tool`: ferramenta de desenvolvimento/CI.
- `dev-tool-service`: serviço de desenvolvimento/testes.
- `isolated-tool`: ferramenta copyleft executada separadamente.
- `isolated-service`: serviço copyleft ou de licença mista executado separadamente.
- `adapter-with-attribution`: integração com atribuição/elemento visual obrigatório.
- `adapter-with-lgpl-boundary`: integração com fronteira técnica explícita para componente LGPL.
- `internal-tool-adapter`: ferramenta interna que não vira dependência direta do produto final.

## Regras

1. Não espalhar imports do upstream pelo consumidor; criar uma única fronteira estável.
2. Nenhum secret pertence a `utilidades`; credenciais ficam no ambiente do consumidor.
3. Não editar submodules para incluir regra de negócio, identidade visual ou permissões do produto.
4. Ferramentas de CI/teste devem ser executadas em versão pinada.
5. Serviços isolados devem se comunicar por protocolo estável, como HTTP, CLI, fila ou socket.

## Grupos

- Documentos/conteúdo: PaddleOCR, AI Website Cloner, PPT Master e Postiz.
- Colaboração/processos: Yjs, bpmn-js e XYFlow.
- UI/catálogo: Storybook e Backstage.
- Infraestrutura: NetBird, APISIX, NATS, Wasmtime, Ansible e Renovate.
- Segurança/supply chain: Trivy, Semgrep, Gitleaks e Cosign.
- Quality engineering: k6, Playwright, WireMock, Pact JS e OpenAPI Generator.
- IA/privacidade/sync: Promptfoo, Presidio, Ollama e Electric.
- Construção/BIM: WebODM e IfcOpenShell.

## Atualizações

1. Resolver a nova versão/commit no upstream.
2. Rever `LICENSE`, `NOTICE` e mudanças de licenciamento.
3. Atualizar gitlink e `catalog/projects.json` no mesmo commit.
4. Verificar `.gitmodules`, SHA do gitlink e catálogo.
5. Só então atualizar os consumidores.
