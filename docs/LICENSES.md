# Licenças dos projetos incorporados

Índice operacional dos upstreams que permaneceram após a curadoria. O catálogo canônico está em `catalog/projects.json`.

## Casos especiais ainda aprovados

- **Renovate** — AGPL-3.0; usar somente como ferramenta de CI isolada, nunca incorporada ao produto distribuído.
- **k6** — AGPL-3.0; usar somente como ferramenta de teste/CI isolada.
- **Semgrep** — LGPL-2.1; manter como ferramenta de CI/CLI isolada e preservar as obrigações da licença.
- **IfcOpenShell** — LGPL-3.0; manter fronteira técnica explícita e execução local sob demanda.
- **MediaBunny** — MPL-2.0; consumir como dependência separada, preservando avisos e mantendo modificações em arquivos MPL sob os termos da MPL-2.0.
- **bpmn-js** — licença permissiva com requisito adicional: o watermark `bpmn.io` deve permanecer visível e inalterado.
- **Wasmtime** — Apache-2.0 com LLVM Exception.
- **PPT Master** — MIT no núcleo catalogado; componentes opcionais com licença diferente não devem ser incorporados automaticamente.
- **WebLLM** — motor Apache-2.0; pesos/modelos são artefatos separados e cada modelo precisa de validação própria de licença antes de empacotamento ou redistribuição.
- **sherpa-onnx** — motor Apache-2.0; modelos de voz/ASR/TTS podem ter licenças próprias e devem ser avaliados individualmente.
- **Univer** — o core OSS catalogado é Apache-2.0; funcionalidades/serviços comerciais opcionais não integram o core aprovado.

Os demais projetos atuais usam licenças permissivas catalogadas, como MIT, BSD-3-Clause ou Apache-2.0, conforme `catalog/projects.json`.

## Regras obrigatórias

- Nunca remover `LICENSE`, `NOTICE`, copyright, atribuições ou marcas exigidas pelo upstream.
- Não relicenciar código de terceiros como se fosse proprietário.
- Evitar modificações locais no upstream; preferir adapters, wrappers, bibliotecas ou CLIs.
- Ferramentas AGPL/LGPL permanecem tecnicamente separadas do código proprietário quando necessário.
- Dependências MPL devem manter a fronteira por arquivo exigida pela licença quando forem modificadas/distribuídas.
- Nenhuma licença source-available/comercial pode virar dependência obrigatória do core.
- Modelos de IA, pesos, fontes, codecs e outros artefatos auxiliares devem ter licença verificada separadamente do repositório que os consome.
- Um projeto que mudar de licença e deixar de atender ao critério R$ 0 deve ser removido até nova revisão.
- O SHA do catálogo identifica a versão cuja política foi revisada; atualizar SHA exige nova verificação.

Este documento é uma política de engenharia e não substitui aconselhamento jurídico.
