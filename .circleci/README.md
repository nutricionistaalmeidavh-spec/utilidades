# CircleCI — utilidades

Este repositório continua tendo o GitHub como fonte única do código. O CircleCI é apenas um executor remoto opcional: ele faz checkout do commit do GitHub e roda validações sobre aquele commit.

## Ativação

1. No CircleCI, abra o projeto `utilidades`.
2. Clique em **Set up**.
3. Escolha usar a configuração existente no repositório (`.circleci/config.yml`).
4. Aponte para a branch `main` quando solicitado.

Depois da ativação, novos commits enviados ao GitHub podem disparar o pipeline automaticamente. Também é possível reexecutar pipelines/jobs pela interface do CircleCI sem alterar o código.

## Jobs atuais

- `qa`: instala `modules/artisys-qa`, roda testes unitários, valida manifesto/pacote e executa o teste de referência no Chromium via Playwright.
- `module_contracts`: reproduz no Linux os principais contratos já verificados em GitHub Actions, incluindo upload, annotations, release validator, serial/printing, documents, API contracts, Pact, browser e OpenAPI generator fixado por checksum.
- `release_validator_linux`: valida o pacote `artisys-release-validator` no Linux.

A cobertura Windows do release validator continua no GitHub Actions; ela não foi removida nem substituída por um executor pago do CircleCI.

## Independência do fornecedor

Os módulos e testes continuam executáveis localmente/self-hosted e pelo GitHub Actions. CircleCI não é dependência de runtime, build ou distribuição de nenhum módulo. Nenhum serviço pago é necessário para o funcionamento do repositório.

## Segurança

A configuração inicial não exige secrets do CircleCI. Credenciais de produção, Cloudflare, Drive ou outros serviços externos não devem ser adicionadas ao arquivo YAML. Caso algum job futuro precise delas, use variáveis protegidas/contextos do provedor e mantenha o caminho local/self-hosted equivalente.
