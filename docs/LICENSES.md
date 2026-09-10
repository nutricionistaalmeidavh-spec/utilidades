# Licenças dos projetos incorporados

Índice operacional. O texto integral e oficial de cada licença permanece dentro do respectivo submodule/upstream. O catálogo canônico está em `catalog/projects.json`.

## Casos especiais

- **NetBird** — BSD-3-Clause no geral, mas `management/`, `signal/`, `relay/` e `combined/` são AGPL-3.0: serviço isolado.
- **Renovate** — AGPL-3.0: ferramenta isolada.
- **k6** — AGPL-3.0: ferramenta isolada.
- **WebODM** — AGPL-3.0: serviço isolado.
- **Ansible** — GPL-3.0: ferramenta externa/CLI isolada.
- **Semgrep** — LGPL-2.1: manter fronteira clara e preservar obrigações LGPL.
- **IfcOpenShell** — LGPL-3.0: usar adapter com fronteira explícita.
- **bpmn-js** — licença permissiva com requisito adicional: o watermark `bpmn.io` deve permanecer visível e inalterado.
- **Wasmtime** — Apache-2.0 com LLVM Exception.
- **Coder** — AGPL-3.0: serviço isolado.
- **ONLYOFFICE DocumentServer** — AGPL-3.0: serviço isolado.
- **Immich** — AGPL-3.0: serviço isolado.
- **Filestash** — AGPL-3.0: serviço isolado.
- **pretix** — AGPL-3.0 com termos adicionais da Seção 7 e requisitos de atribuição/uso: serviço isolado e revisão específica antes de qualquer oferta comercial.
- **Penpot** — MPL-2.0: manter a fronteira do serviço e preservar as obrigações da MPL para arquivos modificados.
- **Outline** — Business Source License 1.1 no commit fixado; não é licença open source. O uso como “Document Service” comercial é restringido. Para a versão fixada, a licença prevê mudança para Apache-2.0 em 2030-09-09. Manter apenas como referência/serviço isolado até revisão específica.
- **Remotion** — licença própria com critérios por tipo/tamanho da entidade e licença comercial em determinados casos. Não incorporar ao produto sem validar elegibilidade/licença do uso específico.
- **Infisical** — conteúdo fora de diretórios `ee/` é MIT Expat; conteúdo empresarial, quando aplicável, segue licença separada. Consumir como serviço isolado e revisar qualquer código `ee/` antes de uso.
- **Cal.com / cal.diy** — o repositório canônico fixado nesta coleção declara MIT no commit registrado.
- **Saleor** — BSD-3-Clause.
- **OpenRefine** — BSD-3-Clause.
- **OpenCV**, **OpenFGA**, **Keycloak**, **Medplum**, **ThingsBoard** e **Timefold Solver** — Apache-2.0 no upstream/commit catalogado.

## Regras obrigatórias

- Nunca remover `LICENSE`, `NOTICE`, copyright, atribuições ou marcas exigidas pelo upstream.
- Não relicenciar código de terceiros como se fosse proprietário.
- Evitar modificações locais em upstream; preferir adapters, wrappers, CLIs ou serviços externos.
- AGPL/GPL e licenças mistas permanecem isoladas do código proprietário até revisão específica.
- LGPL e MPL devem manter fronteiras técnicas claras e preservar as condições do upstream.
- Licenças source-available ou comerciais, como BSL/Remotion License, não devem ser tratadas como open source nem incorporadas ao produto sem revisão explícita.
- O SHA do catálogo identifica a versão cuja política foi registrada; atualizar SHA exige nova verificação de licença.

Este documento é uma política de engenharia e não substitui aconselhamento jurídico.
