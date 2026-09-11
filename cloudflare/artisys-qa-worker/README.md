# ArtiSys QA Cloud Worker

Backend opcional de observabilidade remota do ArtiSys QA. O QA local continua funcionando sem Cloudflare.

## Produção atual

A configuração real já está versionada em `wrangler.jsonc` com os valores confirmados:

- Worker: `utilidades`
- D1: `artisysqa`
- D1 id: `ad323bd1-fa46-434b-8285-b5eb94a8f716`
- D1 binding: `env.DB`
- R2 bucket: `artisysqa`
- R2 binding: `env.R2`

O `database_id` e os nomes de bindings não são secrets. Nenhuma credencial é commitada.

## Secrets

O Worker exige duas credenciais diferentes:

- `ARTISYS_QA_AGENT_TOKEN` -> escrita do agente Windows
- `ARTISYS_QA_READ_TOKEN` -> dashboard/API privada de leitura

Não é necessário criá-las manualmente no painel. O script `setup-production.ps1` gera valores aleatórios localmente, envia-os ao Cloudflare via Wrangler sem imprimi-los e guarda o token de leitura protegido pelo DPAPI do Windows.

## Estrutura

- `src/worker.js` -> entrypoint e dashboard remoto
- `src/api.js` -> API autenticada D1/R2
- `migrations/0001_init.sql` -> schema do D1
- `wrangler.jsonc` -> configuração real do Worker `utilidades`
- `wrangler.jsonc.template` -> template reutilizável
- `setup-production.ps1` -> login, secrets, migration, deploy e vínculo do agente
- `show-reader-token.ps1` -> recupera localmente o token de leitura protegido

## Setup automático recomendado

No PC que executa o ArtiSys QA Agent, a partir de um checkout atualizado do repo:

```powershell
cd cloudflare\artisys-qa-worker
powershell -ExecutionPolicy Bypass -File .\setup-production.ps1
```

O script executa:

1. `npm install` do Wrangler;
2. verifica login Cloudflare e abre autorização se necessário;
3. gera `ARTISYS_QA_AGENT_TOKEN` e `ARTISYS_QA_READ_TOKEN` separadamente;
4. grava os dois como Worker secrets sem mostrar os valores;
5. aplica as migrations no D1 `artisysqa`;
6. faz deploy do Worker `utilidades`;
7. tenta descobrir automaticamente a URL `workers.dev`;
8. salva `ARTISYS_QA_CLOUD_AGENT_TOKEN` no ambiente do usuário Windows;
9. aponta o ArtiSys QA Agent para o Worker e reinicia a tarefa agendada;
10. guarda o token de leitura criptografado com DPAPI em `%LOCALAPPDATA%\ArtiSys\QA`.

Se o deploy não retornar a URL automaticamente, o script pede apenas a URL do Worker. Ele não pede para você criar ou copiar secrets.

## Cloudflare Workers Builds

Para o repositório monorepo `utilidades`, o Worker conectado ao GitHub deve usar:

- Root directory: `cloudflare/artisys-qa-worker`
- Build command: vazio ou `npm install`
- Deploy command: `npx wrangler deploy --config wrangler.jsonc`
- Production branch: `main`

Como `wrangler.jsonc` já contém os valores reais, não é necessário copiar o template para produção.

## D1

O setup automático aplica `migrations/0001_init.sql` no banco `artisysqa`.

Equivalente manual:

```powershell
cd cloudflare\artisys-qa-worker
npm install
npx wrangler d1 migrations apply artisysqa --remote --config wrangler.jsonc
```

## API

Escrita do agente:

```text
POST /api/v1/heartbeat
POST /api/v1/jobs/:jobId/events
POST /api/v1/jobs/:jobId/artifacts
```

Leitura autenticada:

```text
GET /api/v1/machines
GET /api/v1/jobs/current
GET /api/v1/history
GET /api/v1/jobs/:jobId
GET /api/v1/jobs/:jobId/events
GET /api/v1/jobs/:jobId/artifacts
GET /api/v1/artifacts/:artifactId
POST /api/v1/jobs/:jobId/share
```

`GET /health` é público e informa apenas disponibilidade dos bindings, nunca secrets.

## Dashboard e links temporários

O dashboard usa `ARTISYS_QA_READ_TOKEN`. Para consultar o token apenas no PC que fez o setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\show-reader-token.ps1
```

O dashboard pode gerar um link temporário de um único job com validade máxima de uma hora. Esse é o mecanismo recomendado para inspeção externa/assistida sem revelar o token privado de leitura.

## O que ainda depende de ação externa

Depois que esta versão estiver na `main` e o agente atualizar para 2.4.1, falta somente executar `setup-production.ps1` uma vez no PC. O script precisa que você autorize o login Cloudflare no navegador, porque credenciais da sua conta nunca são armazenadas no repositório nem acessíveis ao agente automaticamente.

Se a integração GitHub do Worker ainda não estiver apontando para `cloudflare/artisys-qa-worker`, ajuste uma vez o Root directory no painel conforme acima. Depois disso, commits em `main` podem continuar o deploy normal.

## Verificação

GitHub Actions não é requisito deste módulo. Se a conta não alocar um runner, os jobs podem terminar sem executar nenhuma etapa. A ativação estável continua protegida pelo updater A/B do Windows, que valida o candidato localmente antes de trocar o slot ativo e faz rollback automático se a validação falhar.

## Política de falha

Cloudflare é somente espelho de observabilidade. Falha de rede, D1, R2 ou Worker nunca altera o resultado do QA local, o release gate, o upload para Drive, a bridge nem o updater A/B.
