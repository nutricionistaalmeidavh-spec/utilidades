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

O CircleCI do repositório permanece vermelho. Isso não nasceu desta entrega: jobs antigos (`qa`, `module_contracts` e `release_validator_linux`) já estavam falhando em commits anteriores. O novo motor passa localmente, mas a causa remota do CircleCI precisa ser tratada separadamente quando houver acesso ao failure report/log do serviço.

## Woodpecker

A configuração usa `windows/amd64` + backend `local`, porque este fluxo precisa poder executar Electron, Inno Setup e ferramentas instaladas no Windows. O backend local não isola os comandos; por isso deve ser usado somente em infraestrutura confiável.
