# Guia de integração das utilidades

## Objetivo

`utilidades` é o registro central de componentes open source externos aprovados. Ele controla origem, versão fixada, licença e finalidade. A integração funcional acontece no repositório consumidor por meio de um adaptador local.

## Fluxo padrão

```text
Projeto consumidor
      ↓
adaptador local
      ↓
utilidade aprovada / serviço isolado
      ↓
upstream open source
```

### 1. Selecionar a utilidade

Consultar `catalog/projects.json` e usar exatamente o projeto/commit aprovado.

### 2. Criar uma fronteira no consumidor

O consumidor não deve importar detalhes internos do upstream em vários pontos. Criar uma única camada de integração com interface estável. Exemplos de nomes:

- `DocumentIntelligenceProvider` para PaddleOCR;
- `SiteReconstructionProvider` para AI Website Cloner;
- `ReportEngineProvider` para PPT Master;
- `SocialPublishingProvider` para Postiz.

### 3. Isolar configuração e credenciais

Nenhum segredo deve entrar em `utilidades`. Chaves, tokens, endpoints privados e credenciais pertencem ao ambiente do projeto consumidor.

### 4. Atualizações

Atualizar primeiro o submodule neste repositório, registrar o novo commit em `catalog/projects.json`, revisar a licença/changelog e somente depois atualizar os consumidores.

## Estratégia por projeto

### PaddleOCR

Preferir execução como processo/serviço Python isolado quando o consumidor principal for TypeScript/Electron/Worker. O adaptador do consumidor envia o arquivo e recebe uma resposta estruturada. Primeiro alvo previsto: documentos digitalizados do FluxoDRE/MH.

### AI Website Cloner Template

Tratar como ferramenta interna de desenvolvimento/prospecção, não como dependência de runtime dos sites gerados. A saída deve ser revisada e adaptada ao design system e às regras do projeto consumidor.

### PPT Master

Tratar como motor de geração. O consumidor envia dados/documentos e recebe `.pptx`; templates e identidade visual permanecem no sistema consumidor.

### Postiz

Por ser AGPL-3.0, preferir implantação como serviço separado e comunicação por API/integração externa. Não copiar módulos do Postiz para dentro de um produto proprietário sem análise específica das obrigações da licença.

## Regra de ownership

- `utilidades`: terceiros, versões, licenças, referências e política de uso.
- projeto consumidor: adapter, regras de negócio, UI, permissões e configuração.
- upstream: código original e evolução do componente open source.
