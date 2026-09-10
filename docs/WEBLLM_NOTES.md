# WebLLM — como entra no utilidades

WebLLM é um motor Apache-2.0 para inferência de LLM diretamente no navegador usando WebGPU. O core aprovado neste repositório não depende de servidor de inferência, API paga ou PC ligado: o modelo é baixado pelo cliente e executado no dispositivo do usuário.

## O que isso permite

- chat/assistente local dentro de PWA ou app web compatível;
- resumo, classificação e extração sem enviar o conteúdo para uma API externa;
- inferência offline depois que os artefatos necessários estiverem em cache, conforme a estratégia do produto;
- possibilidade de usar Worker/Web Worker para não bloquear a UI.

## Limitações reais

- modelos ocupam de centenas de MB a vários GB;
- desempenho depende fortemente da GPU/WebGPU e da memória do dispositivo;
- iPhones, aparelhos Android e notebooks mais fracos podem exigir modelos menores;
- o primeiro carregamento pode ser pesado porque os pesos precisam ser obtidos e armazenados;
- a licença do motor é Apache-2.0, mas cada modelo/peso usado tem licença própria e precisa de triagem separada.

## Regra ArtiSys

WebLLM entra como capacidade opcional/embutida. Nunca pode transformar uma função essencial do produto em algo que só funcione em hardware potente. Para recursos críticos, manter fallback determinístico/local simples ou tornar IA claramente opcional.
