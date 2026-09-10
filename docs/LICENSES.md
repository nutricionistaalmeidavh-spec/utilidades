# Licenças dos projetos incorporados

Índice operacional dos upstreams que permaneceram após a curadoria. O catálogo canônico está em `catalog/projects.json`.

## Casos especiais ainda aprovados

- **Renovate** — AGPL-3.0; usar somente como ferramenta de CI isolada, nunca incorporada ao produto distribuído.
- **k6** — AGPL-3.0; usar somente como ferramenta de teste/CI isolada.
- **Semgrep** — LGPL-2.1; manter como ferramenta de CI/CLI isolada e preservar as obrigações da licença.
- **IfcOpenShell** — LGPL-3.0; manter fronteira técnica explícita e execução local sob demanda.
- **bpmn-js** — licença permissiva com requisito adicional: o watermark `bpmn.io` deve permanecer visível e inalterado.
- **Wasmtime** — Apache-2.0 com LLVM Exception.
- **PPT Master** — MIT no núcleo catalogado; componentes opcionais com licença diferente não devem ser incorporados automaticamente.

Os demais projetos atuais usam licenças permissivas catalogadas, como MIT ou Apache-2.0, conforme `catalog/projects.json`.

## Regras obrigatórias

- Nunca remover `LICENSE`, `NOTICE`, copyright, atribuições ou marcas exigidas pelo upstream.
- Não relicenciar código de terceiros como se fosse proprietário.
- Evitar modificações locais no upstream; preferir adapters, wrappers, bibliotecas ou CLIs.
- Ferramentas AGPL/LGPL permanecem tecnicamente separadas do código proprietário quando necessário.
- Nenhuma licença source-available/comercial pode virar dependência obrigatória do core.
- Um projeto que mudar de licença e deixar de atender ao critério R$ 0 deve ser removido até nova revisão.
- O SHA do catálogo identifica a versão cuja política foi revisada; atualizar SHA exige nova verificação.

Este documento é uma política de engenharia e não substitui aconselhamento jurídico.
