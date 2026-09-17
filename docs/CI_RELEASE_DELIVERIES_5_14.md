# Entregas 5–14 — CI e release

Status de implementação do segundo lote.

| Entrega | Estado | Resultado |
|---:|---|---|
| 5 | concluída | `artisys-release` evoluído para motor provider-neutral de pipeline |
| 6 | concluída | perfis `quick`, `full` e `release` |
| 7 | concluída no contrato | QA, segurança e demais ferramentas entram como comandos/adapters do consumidor, sem acoplamento a provedor |
| 8 | concluída | ordem canônica fixa `build → installer → qa` |
| 9 | concluída | estágio de evidências + relatório JSON; arquivos concretos continuam produzidos pelo consumidor |
| 10 | concluída | wrapper PowerShell para execução com um comando |
| 11 | concluída | workflow manual compatível com execução local via `act` |
| 12 | concluída no repositório | workflow Woodpecker Windows/local e script de inicialização do agente; ativação do servidor/webhook exige credenciais externas |
| 13 | concluída | templates para adoção pelos demais sistemas |
| 14 | concluída localmente | testes unitários, syntax check, exemplo, dry-run e package dry-run do módulo |

## Validação

O núcleo foi validado com Node 22: 10 testes passaram; o CLI real executou `lint → test` e produziu relatório `pass`; o empacotamento `npm pack --dry-run` incluiu o CLI.

## Investigação do CircleCI

O histórico permitiu separar regressão de código de indisponibilidade externa:

- no commit `dbe3a25`, `release_validator_linux` estava verde;
- nos commits seguintes ele passou a falhar junto com `qa` e `module_contracts` sem alteração do módulo/fluxo que havia passado;
- após adicionar `release_pipeline`, todos os quatro jobs apareceram falhando juntos;
- o `artisys-release` continuou passando nos testes e na execução local.

A causa exata da conta CircleCI exige o failure report autenticado do serviço. O padrão observado é compatível com bloqueio de execução por conta/plano/runner; a documentação do CircleCI confirma que, no Free Plan, jobs deixam de rodar quando os créditos acabam.

### Mitigação aplicada

CircleCI permanece disponível, porém o workflow agora depende do parâmetro booleano `run_ci`, com `default: false`. Assim:

- pushes normais não gastam créditos nem criam jobs CircleCI;
- o pipeline pode ser reativado explicitamente pela UI/API com `run_ci=true`;
- CI/release continua funcional via terminal local, `act` e Woodpecker;
- nenhuma lógica foi removida ou duplicada.

## Woodpecker

A configuração usa `windows/amd64` + backend `local`, porque este fluxo precisa poder executar Electron, Inno Setup e ferramentas instaladas no Windows. O backend local não isola os comandos; por isso deve ser usado somente em infraestrutura confiável.
