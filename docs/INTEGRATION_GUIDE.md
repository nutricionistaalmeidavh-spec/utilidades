# Guia de integração das utilidades

## Objetivo

`utilidades` guarda apenas projetos que possam ser realmente consumidos pelos sistemas ArtiSys sem infraestrutura operacional permanente.

```text
Projeto consumidor
      ↓
Módulo ArtiSys
      ↓
adapter / biblioteca / CLI / GitHub Action
      ↓
upstream aprovado
```

## Classes de execução aceitas

### `embedded`
Biblioteca executada dentro do próprio navegador, Node/Electron, .NET, Python ou runtime já pertencente ao produto.

Exemplos atuais: Yjs, bpmn-js, XYFlow, Wasmtime e OpenCV.

### `ci`
Ferramenta usada durante build, testes, análise ou release em GitHub Actions/CI. Ela pode iniciar processos temporários durante o job, mas nada permanece ligado depois.

Exemplos atuais: Playwright, Trivy, Semgrep, Gitleaks, Cosign, k6, WireMock, Pact JS, OpenAPI Generator, Promptfoo e Renovate.

### `local-on-demand`
Processo ou biblioteca local acionado apenas quando o usuário ou o Desktop precisa executar uma tarefa. Pode usar CPU/GPU/arquivos locais, mas não pode exigir daemon ou servidor permanente.

Exemplos atuais: PaddleOCR, Presidio, PPT Master e IfcOpenShell.

### `dev-tool`
Ferramenta usada apenas no desenvolvimento e que não participa do runtime do cliente.

## Rejeição automática

Um novo projeto deve ser rejeitado se qualquer uma destas condições for verdadeira:

1. exige servidor, daemon, banco de dados ou container permanentemente ligado;
2. exige VPS, PC dedicado, homelab ou runner `self-hosted` para o funcionamento normal;
3. só entrega valor como aplicação completa hospedada, sem capacidade reutilizável clara;
4. depende obrigatoriamente de API/serviço pago ou conta cloud externa;
5. é apenas referência arquitetural/visual sem código reutilizável que justifique virar submodule;
6. possui licença source-available/comercial incompatível com o core R$ 0;
7. sua integração faria o produto depender operacionalmente da infraestrutura do autor do upstream.

## Regras de consumo

1. Não espalhar imports específicos do upstream pelo domínio do produto; usar uma fronteira local estável quando necessário.
2. Regras de negócio, identidade visual, permissões e dados pertencem ao consumidor.
3. Secrets ficam no produto/CI, nunca em `utilidades`.
4. Dependências de CI devem usar versão aprovada e preferencialmente pinada.
5. Processos `local-on-demand` devem iniciar apenas durante a operação e terminar ao final dela.
6. GitHub Actions hospedado é o padrão para automações de CI; não criar requisito de runner self-hosted.
7. Serviço pago pode existir somente como alternativa opcional e substituível, nunca como requisito silencioso.
8. Antes de atualizar um upstream, rever licença, modo de execução, dependências e compatibilidade.
9. Um upstream que mudar e passar a exigir infraestrutura permanente deve ser removido do catálogo.

## Camada `projects/`

Contém os upstreams externos intactos como submodules fixados em commit. O campo `runtimeClass` de `catalog/projects.json` informa como o projeto pode ser usado de forma compatível com esta política.

## Camada `modules/`

Contém integrações ArtiSys reutilizáveis. Os modos de reutilização permitidos são:

- `shared` — núcleo comum versionado aqui e consumido por vários produtos;
- `snapshot` — base copiada deliberadamente e customizada no consumidor.

Não criar novos módulos com dependência de serviço always-on.

## Fluxo de promoção

```text
candidato GitHub
      ↓
verificar utilidade real
      ↓
verificar licença
      ↓
verificar execução
      ↓
embedded / ci / local-on-demand / dev-tool ?
      ↓ sim
projects/ + catálogo
      ↓
adapter/módulo quando necessário
      ↓
teste em consumidor real
```

## Política de custo

O core obrigatório deve funcionar com **R$ 0 de licença/assinatura** e sem máquina mantida ligada pelo usuário. Serviços pagos ou cloud podem aparecer somente como opção explícita, documentada e substituível.
