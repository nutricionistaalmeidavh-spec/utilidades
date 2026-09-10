# utilidades

Repositório central de projetos open source aprovados para reutilização nos sistemas ArtiSys/MH.

A função deste repositório é **guardar, versionar e documentar dependências open source externas**. Os consumidores devem usar uma fronteira própria (adapter, wrapper, CLI ou API) e respeitar a licença upstream.

## Estado atual

- **30 projetos incorporados** como Git submodules.
- Cada submodule está **fixado em um commit exato**.
- `catalog/projects.json` é a fonte de verdade para origem, branch, SHA, licença e política de consumo.
- Projetos com copyleft, licença mista ou exigência especial ficam marcados para uso isolado ou com fronteira explícita.

## Capacidades disponíveis

### Conteúdo e documentos
- PaddleOCR — OCR e inteligência de documentos.
- AI Website Cloner Template — reconstrução/análise de sites.
- PPT Master — apresentações e relatórios editáveis.
- Postiz — publicação e automação social.

### Colaboração e processos
- Yjs — colaboração em tempo real e CRDT.
- bpmn-js — modelagem visual BPMN 2.0.
- XYFlow — editores visuais node-based.

### UI e catálogo de software
- Storybook — catálogo/laboratório de componentes UI.
- Backstage — portal e catálogo de software.

### Infraestrutura e comunicação
- NetBird — rede privada e acesso remoto.
- Apache APISIX — API gateway.
- NATS Server — mensageria/eventos distribuídos.
- Wasmtime — runtime WebAssembly e sandbox de plugins.
- Ansible — automação de infraestrutura.
- Renovate — atualização automática de dependências.

### Segurança e supply chain
- Trivy — vulnerabilidades, misconfig e SBOM.
- Semgrep — análise estática programável.
- Gitleaks — detecção de secrets.
- Cosign — assinatura/verificação de artefatos.

### Quality engineering
- k6 — testes de carga.
- Playwright — testes E2E em navegadores.
- WireMock — mock de APIs.
- Pact JS — contract testing.
- OpenAPI Generator — geração de SDKs/clientes.

### IA, privacidade e sync
- Promptfoo — testes e red teaming de IA.
- Presidio — detecção/anonimização de dados pessoais.
- Ollama — modelos de IA locais.
- Electric — sincronização local-first.

### Construção e BIM
- WebODM — fotogrametria e imagens aéreas.
- IfcOpenShell — IFC e geometria BIM.

## Clonar com as utilidades

```bash
git clone --recurse-submodules https://github.com/nutricionistaalmeidavh-spec/utilidades.git
cd utilidades
git submodule update --init --recursive
```

Se já foi clonado sem submodules:

```bash
git submodule sync --recursive
git submodule update --init --recursive
```

## Regra de consumo

1. `utilidades` é a fonte de verdade para qual upstream, commit e licença estão aprovados.
2. O consumidor usa a forma indicada por `consumption` em `catalog/projects.json`.
3. Não alterar submodules para incluir regras de negócio dos nossos sistemas.
4. Atualizações são feitas primeiro aqui, verificadas, e só depois propagadas aos consumidores.
5. AGPL/GPL, licenças mistas, LGPL e exigências de atribuição recebem tratamento específico em `docs/LICENSES.md`.

Veja `docs/INTEGRATION_GUIDE.md` e `docs/LICENSES.md` antes de conectar uma utilidade a outro projeto.
