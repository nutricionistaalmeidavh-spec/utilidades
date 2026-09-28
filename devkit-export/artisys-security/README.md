# artisys-security 0.2.0

Pipeline executável e compartilhado para desenvolvimento/CI, sem serviço no PDV.
Python 3.10+ (stdlib); ferramentas nativas ou Docker em Linux/WSL2. O modo Docker
usa versões fixas declaradas em `security.py`. Não são declaradas como versões mais
recentes; valide upgrades no seu CI. Imagens estão fixadas por tag, não digest.

```sh
python3 modules/artisys-security/security.py /caminho/produto --engine docker
python3 modules/artisys-security/security.py /caminho/produto --engine docker --mode release
python3 -m unittest discover -s modules/artisys-security/tests -v
```

Sem `--engine docker`, instale Gitleaks 8.24.3, Trivy 0.61.1 e Semgrep 1.116.0
no PATH (não há instalação automática nem alteração do produto). Docker exige
acesso aos registries; Trivy precisa baixar sua base de vulnerabilidades. Não é
um runtime offline do PDV. Nunca use `continue-on-error` neste gate.

## Política de bloqueio

| Achado | Commit/PR | Release |
|---|---|---|
| Segredo Gitleaks | Bloqueia todos | Bloqueia todos |
| Trivy HIGH, CRITICAL ou UNKNOWN | Bloqueia | Bloqueia |
| Trivy MEDIUM | Informa contagem | Bloqueia |
| Semgrep ERROR | Bloqueia | Bloqueia |
| Semgrep WARNING | Informa contagem | Bloqueia |
| LOW/INFO | Informa contagem | Informa contagem |
| Ferramenta ausente, timeout, erro ou JSON inválido/parcial | Bloqueia | Bloqueia |

Saídas: 0 aprovado, 1 achados bloqueantes, 2 execução incompleta. JSON em stdout
contém apenas contagens. stdout/stderr dos scanners são descartados; relatórios
brutos ficam em pasta temporária removida ao terminar. Gitleaks usa redação 100%.
Não se publicam automaticamente arquivos contendo trechos de código ou segredos.
Para diagnóstico, reproduza o scanner localmente e trate a saída como sensível.

Gitleaks verifica arquivos e histórico disponível; release exige checkout Git.
Use `fetch-depth: 0` no CI: release rejeita checkout shallow ou worktree externo.
Trivy verifica dependências (incluindo dev) e configurações; sem lockfiles haverá
cobertura limitada. As três regras locais Semgrep são baseline: eval, execução de
shell e TLS desabilitado. Não representam auditoria completa, taint analysis nem
cobertura de todas as linguagens. Erros de parse Semgrep impedem aprovação.
Respeitam-se exclusões normais das ferramentas; revise `.gitignore`, `.semgrepignore`
e `.gitleaksignore` no produto para não ocultar código que deveria ser verificado.

## Consumir sem copiar implementação

Use `templates/consumer-workflow.yml`: checkout separado do produto e deste repo,
fixando o SHA revisado em `ref`; apenas o YAML de adoção pertence ao consumidor.
O template ainda não é um workflow ativo. Para bloquear merges, configure o job
`security` como check obrigatório na proteção de branch. Para bloquear publicação,
o job de release deve depender deste job via `needs: security`. Tags já publicadas
não são desfeitas pelo gate. Não são alteradas proteções de branch automaticamente.
Um hook local pode chamar o mesmo comando, mas não substitui o gate no CI.

## Validação e fontes

Testes usam relatórios sintéticos e uma fronteira de execução injetada para validar
comandos, redação, política e falhas. Não afirmam que um scan externo foi executado.
As ferramentas externas devem ser executadas no CI com Docker disponível.

- https://github.com/gitleaks/gitleaks/releases/tag/v8.24.3
- https://github.com/aquasecurity/trivy/releases/tag/v0.61.1
- https://github.com/semgrep/semgrep/releases/tag/v1.116.0
- https://github.com/gitleaks/gitleaks (comandos dir/git e redação)
- https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_filesystem/
- https://semgrep.dev/docs/cli-reference

As licenças upstream continuam independentes; este módulo apenas orquestra seus CLIs.
