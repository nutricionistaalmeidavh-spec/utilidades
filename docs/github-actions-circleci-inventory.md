# Inventário GitHub Actions → CircleCI / self-hosted

Auditoria em 2026-09-11 sobre os 23 repositórios do owner `nutricionistaalmeidavh-spec`.

## Política de integração

- O GitHub continua sendo a fonte do código.
- O core dos testes/builds deve continuar executável localmente/self-hosted com ferramentas abertas e custo R$ 0.
- CircleCI é executor remoto opcional, nunca dependência silenciosa.
- Workflows Windows/macOS devem preservar alternativa self-hosted quando o executor cloud não estiver disponível no plano gratuito.
- Deploys/publicações devem chamar scripts do próprio repositório; o CI apenas orquestra esses scripts.

## Resumo

- Repositórios auditados: **23**
- Repositórios com `.github/workflows`: **13**
- Workflows encontrados: **42**
- Repositórios sem workflows: **10**

### Status

- ✅ Espelhado no CircleCI
- 🟡 Parcial / precisa manter cobertura adicional
- ⬜ Pendente
- 🔒 Manter core local/self-hosted; CircleCI apenas opcional

## Matriz completa

| Repositório | Workflow GitHub Actions | Função | Integração alvo | Status |
|---|---|---|---|---|
| Desknutri | `release.yml` | release/build | scripts locais + executor remoto | ⬜ |
| Desknutri | `verify.yml` | verificação/CI | CircleCI Linux + local | ⬜ |
| UniversidadeEmpresarial | `university-ci.yml` | CI da Universidade | CircleCI Linux + local | ⬜ |
| ObranaM-o-Universidade-DreFluxo | `desktop-drive-package.yml` | empacotar/publicar artefato no Drive | script local + CI opcional | 🔒 |
| ObranaM-o-Universidade-DreFluxo | `desktop-installer.yml` | instalador desktop Windows | self-hosted Windows + CI opcional | 🔒 |
| ObranaM-o-Universidade-DreFluxo | `desktop-macos-arm64.yml` | build macOS ARM64 | self-hosted macOS + CI opcional | 🔒 |
| ObranaM-o-Universidade-DreFluxo | `desktop-macos-m1-cross.yml` | build/cross M1 | self-hosted + CI opcional | 🔒 |
| ObranaM-o-Universidade-DreFluxo | `desktop-macos-zip.yml` | pacote ZIP macOS | self-hosted macOS + CI opcional | 🔒 |
| ObranaM-o-Universidade-DreFluxo | `desktop-windows-zip.yml` | pacote ZIP Windows | self-hosted Windows + CI opcional | 🔒 |
| ObranaM-o-Universidade-DreFluxo | `rh-docs-ci.yml` | validação documentos RH | CircleCI Linux + local | ⬜ |
| ObranaM-o-Universidade-DreFluxo | `university-ci.yml` | CI Universidade | CircleCI Linux + local | ⬜ |
| ConsulroriaAmamenta-o | `validate-clinical-documents.yml` | validar documentos clínicos | CircleCI Linux + local | ⬜ |
| ConsulroriaAmamenta-o | `validate-clinical-source-consolidation.yml` | validar consolidação de fontes clínicas | CircleCI Linux + local | ⬜ |
| ConsulroriaAmamenta-o | `validate-improvements-v2.yml` | regressão/validação de melhorias | CircleCI Linux + local | ⬜ |
| ConsulroriaAmamenta-o | `validate-saas-foundation.yml` | validar base SaaS | CircleCI Linux + local | ⬜ |
| Hackathon | `ci.yml` | CI geral | CircleCI Linux + local | ⬜ |
| Hackathon | `mobile-ci.yml` | CI mobile | CircleCI Linux + local; build nativo self-hosted quando necessário | ⬜ |
| OBRANAMAOCOMERCIAL | `artisys-qa-demo.yml` | QA/demo ArtiSys | CircleCI + artisys-qa local | ⬜ |
| OBRANAMAOCOMERCIAL | `commercial-cloudflare-ci.yml` | CI/deploy Cloudflare | script Wrangler local + CircleCI opcional | 🔒 |
| OBRANAMAOCOMERCIAL | `commercial-desktop-ci.yml` | CI desktop | CircleCI para testes portáveis + self-hosted desktop | ⬜ |
| OBRANAMAOCOMERCIAL | `commercial-desktop-drive-package.yml` | empacotar/publicar desktop no Drive | script local + CI opcional | 🔒 |
| OBRANAMAOCOMERCIAL | `commercial-desktop-macos-arm64.yml` | build macOS ARM64 | self-hosted macOS + CI opcional | 🔒 |
| automa-ooublicacao | `verify.yml` | verificação/CI | CircleCI Linux + local | ⬜ |
| CLINICASMEDICAS | `ci.yml` | CI geral | CircleCI Linux + local | ⬜ |
| CLINICASMEDICAS | `desktop-release.yml` | release desktop | self-hosted desktop + CI opcional | 🔒 |
| CLINICASMEDICAS | `runtime-security.yml` | segurança/runtime | CircleCI Linux + local | ⬜ |
| PDVNexus | `build-windows10-pdv.yml` | build Windows 10 | self-hosted Windows + CI opcional | 🔒 |
| PDVNexus | `build-windows8-x86-pdv.yml` | build Windows 8 x86 | self-hosted Windows x86 + CI opcional | 🔒 |
| PDVNexus | `qa-windows10-pdv.yml` | QA Windows 10 | artisys-qa local/self-hosted + CircleCI para parte portátil | ⬜ |
| SaaSGuardrails | `deploy-worker.yml` | deploy Worker | script local + CircleCI opcional | 🔒 |
| SaaSGuardrails | `publish-registry.yml` | publicar registry | script local + CI opcional | 🔒 |
| SaaSGuardrails | `tests.yml` | testes | CircleCI Linux + local | ⬜ |
| PDV-ARTISYS | `qa-capture.yml` | QA/captura/evidências | artisys-qa local + CircleCI | ⬜ |
| PDV-ARTISYS | `release-windows.yml` | release Windows | self-hosted Windows + CI opcional | 🔒 |
| PDV-ARTISYS | `verify.yml` | verificação/CI | CircleCI Linux + local | ⬜ |
| utilidades | `artisys-qa-ci.yml` | testes do artisys-qa + Playwright | CircleCI `qa` | ✅ |
| utilidades | `artisys-qa-reusable.yml` | workflow reutilizável para consumidores | scripts/CLI compartilhados + template CircleCI consumidor | 🟡 |
| utilidades | `artisys-release-validator-ci.yml` | release validator Linux/Windows | CircleCI Linux; Windows permanece coberto fora dele | 🟡 |
| utilidades | `module-checks.yml` | contratos/módulos/hardware/OpenAPI/Pact | CircleCI `module_contracts` | ✅ |
| OficinaAgricola | `artisys-qa-integration.yml` | integração ArtiSys QA | CircleCI + artisys-qa local | ⬜ |
| OficinaAgricola | `artisys-qa-stage7.yml` | QA etapa 7 | CircleCI + artisys-qa local | ⬜ |
| OficinaAgricola | `ci.yml` | CI geral | CircleCI Linux + local | ⬜ |

## Repositórios sem GitHub Actions no momento

- `Landing-Page`
- `nuxt-starter`
- `MercadoLivre`
- `systemfactory`
- `drefluxo`
- `CompatibilizaBIM`
- `cbim`
- `cyber-study-hub`
- `DesignUIWPPBoot`
- `frontEnds`

## Ordem recomendada de integração

1. **utilidades** — concluir equivalência do workflow reutilizável e documentar template consumidor.
2. **PDV-ARTISYS** — próximo repositório prioritário: verify + QA no CircleCI; release Windows preservado self-hosted/GitHub.
3. **PDVNexus** e **OficinaAgricola** — QA/CI e builds Windows sem perder versões legadas.
4. **CLINICASMEDICAS**, **Hackathon**, **UniversidadeEmpresarial**, **ConsulroriaAmamenta-o**, **Desknutri** — CI/testes/segurança/validações.
5. **OBRANAMAOCOMERCIAL** e **ObranaM-o-Universidade-DreFluxo** — separar CI portátil dos builds Windows/macOS/Drive.
6. **SaaSGuardrails** e `automa-ooublicacao` — testes primeiro; deploy/publish depois, sempre chamando scripts locais.

## Gate para considerar um repositório integrado

- [ ] Todos os workflows GitHub Actions do repositório estão classificados.
- [ ] Testes/QA portáveis rodam localmente e no CircleCI.
- [ ] Nenhum teste crítico existe somente dentro de YAML de fornecedor.
- [ ] Artefatos/evidências são preservados.
- [ ] Secrets estão documentados sem serem commitados.
- [ ] Windows/macOS possuem caminho self-hosted quando necessário.
- [ ] GitHub Actions original só é removido após equivalência comprovada.
- [ ] Um commit/PR real confirma status verde no GitHub e no executor alternativo.
