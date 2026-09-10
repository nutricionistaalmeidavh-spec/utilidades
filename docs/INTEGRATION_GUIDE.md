# Guia de integração das utilidades

## Objetivo

`utilidades` separa upstreams externos aprovados de módulos ArtiSys reutilizáveis.

```text
Projeto consumidor
      ↓
Módulo ArtiSys em modules/
      ↓
adapter / wrapper / CLI / API
      ↓
upstream em projects/
```

## Camada `projects/`

Registra componentes open source externos aprovados, controlando origem, versão fixada, licença e forma de consumo. Nenhuma regra de negócio, identidade visual ou permissão de produto deve ser adicionada aos submodules.

### Formas de consumo dos upstreams

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
- `isolated-reference`: referência arquitetural/funcional que não deve ser incorporada sem revisão específica.
- `license-review-required`: uso bloqueado para produto comercial até revisão explícita da licença aplicável.

## Camada `modules/`

Contém kits ArtiSys reutilizáveis. Cada módulo deve declarar:

- upstreams utilizados;
- fronteira técnica;
- modo de consumo;
- consumidores recomendados;
- estágio de maturidade;
- instruções de integração e verificação.

### Modos de consumo dos módulos

- `shared`: código/configuração comum que deve permanecer sincronizado com a fonte central.
- `snapshot`: ponto de partida copiado para o consumidor e depois customizado localmente.
- `service`: upstream executado isoladamente e acessado por API, CLI, fila ou socket; o consumidor recebe somente a fronteira ArtiSys.

## Regras obrigatórias

1. Não espalhar imports do upstream pelo consumidor; usar uma fronteira local estável.
2. Nenhum secret pertence a `utilidades`; credenciais ficam no ambiente do consumidor.
3. Não editar submodules para incluir regra de negócio, identidade visual ou permissões do produto.
4. Ferramentas de CI/teste devem usar versão aprovada/pinada.
5. Serviços isolados devem se comunicar por protocolo estável, como HTTP, CLI, fila ou socket.
6. O módulo não pode esconder obrigações de licença do upstream.
7. Regras de negócio específicas permanecem no sistema consumidor.
8. Uma atualização de upstream só chega aos consumidores depois de validação no `utilidades`.
9. O mesmo módulo pode ser adotado por vários produtos sem obrigá-los a usar a mesma regra de negócio.
10. **Política de custo ArtiSys:** o core obrigatório de qualquer módulo deve poder operar com custo de licença/assinatura **R$ 0**, preferencialmente com solução **open source e/ou self-hosted**. Serviços, APIs, planos comerciais ou recursos pagos só podem existir como **opção explícita**, documentada e substituível, e nunca como dependência silenciosa ou requisito oculto para o funcionamento do core.

## Grupos de upstreams

- Documentos/conteúdo: PaddleOCR, AI Website Cloner e PPT Master.
- Colaboração/processos: Yjs, bpmn-js e XYFlow.
- UI/catálogo: Storybook e Backstage.
- Infraestrutura: NetBird, APISIX, NATS, Wasmtime, Ansible e Renovate.
- Segurança/supply chain: Trivy, Semgrep, Gitleaks e Cosign.
- Quality engineering: k6, Playwright, WireMock, Pact JS e OpenAPI Generator.
- IA/privacidade/sync: Promptfoo, Presidio, Ollama e Electric.
- Construção/BIM: WebODM e IfcOpenShell.
- Dados/design/office/media: OpenRefine, Penpot, ONLYOFFICE, Immich e Filestash.
- Commerce/eventos/agendamento: Saleor, pretix e Cal.com/cal.diy.
- Plataforma/identidade/autorização: Coder, Keycloak, OpenFGA e Infisical.
- Saúde/IoT/otimização: Medplum, ThingsBoard e Timefold Solver.
- Referências com revisão especial: Outline e Remotion.

## Fluxo de promoção

```text
upstream novo/atualizado
        ↓
projects/ + catalog/projects.json
        ↓
validação de licença e segurança
        ↓
module correspondente
        ↓
testes do módulo
        ↓
consumidores selecionados
```

## Atualizações

1. Resolver a nova versão/commit no upstream.
2. Rever `LICENSE`, `NOTICE` e mudanças de licenciamento.
3. Atualizar gitlink e `catalog/projects.json` no mesmo commit.
4. Verificar `.gitmodules`, SHA do gitlink e catálogo.
5. Verificar o módulo ArtiSys que depende desse upstream.
6. Atualizar `catalog/modules.json` quando contrato, versão ou modo de consumo mudar.
7. Só então atualizar os consumidores.
