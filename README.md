# utilidades

Repositório central de projetos open source aprovados para reutilização nos sistemas ArtiSys/MH.

A função deste repositório é **guardar, versionar e documentar dependências open source externas**. Os projetos consumidores não devem copiar código daqui de forma ad-hoc: cada integração deve usar um adaptador próprio no sistema consumidor e respeitar a licença do projeto upstream.

## Projetos incorporados

| Categoria | Projeto | Upstream | Versão fixada | Licença | Uso principal |
|---|---|---|---|---|---|
| Document Intelligence | PaddleOCR | `PaddlePaddle/PaddleOCR` | `2661c7c0ef5c613e8f93c6e93b2e052399f0f854` | Apache-2.0 | OCR, PDFs, documentos escaneados e dados estruturados |
| Site Reconstruction | AI Website Cloner Template | `JCodesMore/ai-website-cloner-template` | `92872bc40ced2c5edb4d5dc9fd3970d40c77f4ca` | MIT | reconstrução/análise de sites para fluxo interno de desenvolvimento |
| Report Engine | PPT Master | `hugohe3/ppt-master` | `64b65839c7f8096a534c872c03d688a2b2491c8f` | MIT | geração de apresentações e relatórios PPTX editáveis |
| Social Publishing | Postiz | `gitroomhq/postiz-app` | `36d5fc7b3ac3f17178b1589cf7a7337523017a41` | AGPL-3.0 | agendamento/publicação de conteúdo e automação social |

Os diretórios em `projects/` são **Git submodules** apontando para commits exatos dos projetos originais. Isso preserva histórico, autoria, licença e facilita atualizações controladas.

## Clonar com as utilidades

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Se o repositório já foi clonado sem os submodules:

```bash
git submodule sync --recursive
git submodule update --init --recursive
```

## Estrutura

```text
projects/
├── document-intelligence/
│   └── paddleocr/
├── site-reconstruction/
│   └── ai-website-cloner-template/
├── report-engine/
│   └── ppt-master/
└── social-publishing/
    └── postiz/

catalog/
└── projects.json

docs/
├── INTEGRATION_GUIDE.md
├── LICENSES.md
└── superpowers/
    ├── specs/
    └── plans/
```

## Regra de consumo

1. `utilidades` é a fonte de verdade para **qual upstream, commit e licença** estão aprovados.
2. O sistema consumidor recebe um adaptador próprio; não deve alterar diretamente o código do submodule.
3. Atualizações de versão são feitas primeiro aqui, verificadas, e depois propagadas aos consumidores.
4. Dependências AGPL, em especial Postiz, devem permanecer isoladas do código proprietário até revisão específica da forma de integração.

Veja `docs/INTEGRATION_GUIDE.md` e `docs/LICENSES.md` antes de conectar uma utilidade a outro projeto.
