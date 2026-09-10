# Guia de integração das utilidades

## Objetivo

`utilidades` separa upstreams externos de módulos ArtiSys reutilizáveis.

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

## Camada `modules/`

Contém kits ArtiSys reutilizáveis. Cada módulo deve declarar:

- upstreams utilizados;
- fronteira técnica;
- modo de consumo;
- consumidores recomendados;
- estágio de maturidade;
- instruções de integração e verificação.

### Modos de consumo

- `shared`: módulo comum que deve permanecer sincronizado com a fonte central.
- `snapshot`: ponto de partida copiado para o consumidor e depois customizado localmente.
- `service`: upstream executado isoladamente e acessado por API, CLI, fila ou socket.

## Regras obrigatórias

1. Não espalhar imports do upstream pelo consumidor; usar uma fronteira local estável.
2. Nenhum secret pertence a `utilidades`; credenciais ficam no ambiente do consumidor.
3. Não editar submodules para incluir regra de negócio, identidade visual ou permissões do produto.
4. Ferramentas de CI/teste devem usar versão aprovada/pinada.
5. Serviços isolados devem se comunicar por protocolo estável.
6. O módulo não pode esconder obrigações de licença do upstream.
7. Uma atualização de upstream só chega aos consumidores depois de validação no `utilidades`.

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
4. Verificar o módulo ArtiSys que depende desse upstream.
5. Atualizar `catalog/modules.json` quando contrato, versão ou modo de consumo mudar.
6. Só então atualizar os consumidores.
