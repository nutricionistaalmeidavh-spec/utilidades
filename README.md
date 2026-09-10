# utilidades

Repositório central de projetos open source aprovados e módulos ArtiSys reutilizáveis para os sistemas ArtiSys/MH.

A função deste repositório é **guardar, versionar e documentar dependências open source externas** e manter uma camada própria de integração reutilizável. Os consumidores devem usar uma fronteira ArtiSys (adapter, wrapper, CLI ou API) e respeitar a licença upstream.

## Arquitetura do repositório

- `projects/` — upstreams externos intactos, incorporados como Git submodules e fixados em commit exato.
- `modules/` — kits ArtiSys reutilizáveis construídos sobre esses upstreams.
- `catalog/projects.json` — fonte de verdade para origem, branch, SHA, licença e política de consumo dos upstreams.
- `catalog/modules.json` — fonte de verdade para versão, maturidade, upstreams e consumidores recomendados dos módulos ArtiSys.

## Estado atual

- **48 projetos incorporados** como Git submodules.
- **9 módulos ArtiSys prioritários** registrados.
- Cada submodule está **fixado em um commit exato**.
- Projetos com copyleft, licença mista ou exigência especial ficam marcados para uso isolado ou com fronteira explícita.

## Módulos ArtiSys prioritários

- `artisys-qa` — Playwright e automação de testes E2E/Chromium.
- `artisys-security` — Gitleaks, Trivy e Semgrep em pipeline reutilizável.
- `artisys-documents` — PaddleOCR + OpenCV para documentos, scanner e classificação.
- `artisys-authz` — autorização fina via OpenFGA.
- `artisys-optimizer` — otimização de escalas e recursos via Timefold Solver.
- `artisys-api-contracts` — OpenAPI Generator + Pact JS.
- `artisys-ai-quality` — testes e regressão de IA via Promptfoo.
- `artisys-privacy` — detecção/anonimização de PII via Presidio.
- `artisys-bim` — fronteira BIM baseada em IfcOpenShell.

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

### Novas referências catalogadas
- OpenRefine — limpeza e transformação de dados.
- Coder — ambientes de desenvolvimento remotos.
- Penpot — design e prototipação.
- ONLYOFFICE DocumentServer — edição colaborativa de documentos.
- Immich — gestão de mídia.
- Filestash — gateway de arquivos.
- Saleor — commerce headless.
- pretix — eventos e ingressos.
- Cal.com / cal.diy — agendamento.
- Outline — base de conhecimento, apenas referência conforme licença catalogada.
- Remotion — geração de vídeo, sujeito a revisão de licença.
- OpenCV — visão computacional.
- OpenFGA — autorização baseada em relacionamentos.
- Keycloak — identidade e autenticação.
- Medplum — infraestrutura de saúde/FHIR.
- ThingsBoard — IoT.
- Timefold Solver — otimização e constraint solving.
- Infisical — gestão de secrets.

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

1. `projects/` é a fonte aprovada dos upstreams externos; não recebe regra de negócio ArtiSys.
2. `modules/` é o ponto preferencial de reutilização nos sistemas consumidores.
3. Cada módulo declara `consumptionMode`: `shared`, `snapshot` ou `service`.
4. `shared` deve permanecer sincronizado com a versão central sempre que possível.
5. `snapshot` é copiado deliberadamente para o consumidor quando a customização local é parte do desenho.
6. `service` mantém o upstream isolado e expõe apenas uma fronteira estável ao consumidor.
7. Credenciais e secrets pertencem ao ambiente do consumidor, nunca a `utilidades`.
8. Atualizações são feitas primeiro aqui, verificadas, e só depois propagadas aos consumidores.
9. AGPL/GPL, licenças mistas, LGPL, MPL, BSL e licenças próprias recebem tratamento específico em `docs/LICENSES.md`.

Veja `modules/README.md`, `docs/INTEGRATION_GUIDE.md` e `docs/LICENSES.md` antes de conectar uma utilidade a outro projeto.
