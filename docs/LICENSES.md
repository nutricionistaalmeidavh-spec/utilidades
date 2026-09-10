# Licenças dos projetos incorporados

Índice operacional. O texto integral e oficial de cada licença permanece dentro do respectivo submodule/upstream. O catálogo canônico está em `catalog/projects.json`.

## Casos especiais

- **Postiz** — AGPL-3.0: serviço isolado.
- **NetBird** — BSD-3-Clause no geral, mas `management/`, `signal/`, `relay/` e `combined/` são AGPL-3.0: serviço isolado.
- **Renovate** — AGPL-3.0: ferramenta isolada.
- **k6** — AGPL-3.0: ferramenta isolada.
- **WebODM** — AGPL-3.0: serviço isolado.
- **Ansible** — GPL-3.0: ferramenta externa/CLI isolada.
- **Semgrep** — LGPL-2.1: manter fronteira clara e preservar obrigações LGPL.
- **IfcOpenShell** — LGPL-3.0: usar adapter com fronteira explícita.
- **bpmn-js** — licença permissiva com requisito adicional: o watermark `bpmn.io` deve permanecer visível e inalterado.
- **Wasmtime** — Apache-2.0 com LLVM Exception.

## Regras obrigatórias

- Nunca remover `LICENSE`, `NOTICE`, copyright, atribuições ou marcas exigidas pelo upstream.
- Não relicenciar código de terceiros como se fosse proprietário.
- Evitar modificações locais em upstream; preferir adapters, wrappers, CLIs ou serviços externos.
- AGPL/GPL e licenças mistas permanecem isoladas do código proprietário até revisão específica.
- LGPL deve manter fronteira técnica clara e preservar as condições do upstream.
- O SHA do catálogo identifica a versão cuja política foi registrada; atualizar SHA exige nova verificação de licença.

Este documento é uma política de engenharia e não substitui aconselhamento jurídico.
