# Open Source Utilities Hub — Design

## Objetivo

Transformar `nutricionistaalmeidavh-spec/utilidades` no repositório central de projetos open source externos aprovados para uso futuro pelos demais sistemas, sem misturar esse código com `systemfactory`, `frontEnds` ou regras de negócio de produtos.

## Decisão arquitetural

Os upstreams são incorporados como **Git submodules fixados em commits exatos**. O repositório mantém um catálogo legível por máquina, documentação de licenças e regras de integração. Cada projeto consumidor implementará posteriormente o próprio adapter, evitando dependência difusa dos detalhes internos do upstream.

## Escopo inicial

1. PaddlePaddle/PaddleOCR — Document Intelligence.
2. JCodesMore/ai-website-cloner-template — Site Reconstruction.
3. hugohe3/ppt-master — Report Engine.
4. gitroomhq/postiz-app — Social Publishing.

## Estrutura

```text
utilidades/
├── .gitmodules
├── README.md
├── catalog/projects.json
├── projects/
│   ├── document-intelligence/paddleocr
│   ├── site-reconstruction/ai-website-cloner-template
│   ├── report-engine/ppt-master
│   └── social-publishing/postiz
└── docs/
    ├── INTEGRATION_GUIDE.md
    └── LICENSES.md
```

## Regras

- Não armazenar secrets.
- Não modificar código upstream dentro deste hub como primeira opção.
- Todo upstream deve ficar fixado em commit conhecido.
- Toda atualização exige atualização do catálogo.
- Licenças e autoria devem ser preservadas.
- Postiz, por AGPL-3.0, será classificado como `isolated-service`; nenhum produto proprietário o incorporará diretamente sem revisão específica.

## Verificação

A entrega é considerada válida quando `.gitmodules`, `catalog/projects.json` e a árvore Git apontarem para os mesmos quatro upstreams e os mesmos quatro commits fixados.
