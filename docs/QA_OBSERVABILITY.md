# ArtiSys QA — Observabilidade do Agente

A partir da versão 2.4.0, o Windows ArtiSys QA Agent mantém telemetria durável e oferece um console local somente leitura para acompanhar jobs sem abrir o terminal.

## Estados visíveis

O agente registra e exibe, quando aplicável:

```text
QUEUED
SYNCING_PROJECT
INSTALLING_DEPENDENCIES
REGISTERING_PROJECT
STARTING_QA
RUNNING_QA
CAPTURING_ARTIFACTS
GENERATING_REPORT
UPLOADING_ARTIFACTS
PASSED
FAILED
PENDING_UPLOAD
STALLED
INTERRUPTED
```

A bridge continua outbound-only e não ganha execução arbitrária de shell.

## Habilitar acesso pela rede local

No PC que executa o agente:

```powershell
artisys-qa-agent console lan on
```

O agente aplica a nova vinculação automaticamente em alguns segundos. Não é necessário manter o PowerShell aberto.

Para ver os endereços disponíveis:

```powershell
artisys-qa-agent console status
```

O resultado lista uma ou mais URLs como:

```text
http://192.168.1.25:4160
```

No celular conectado à mesma rede Wi-Fi, abra uma das URLs.

## Token do console

O console usa um token próprio, separado dos tokens de Remote Control dos projetos.

Para consultá-lo localmente:

```powershell
artisys-qa-agent console token
```

O token fica apenas no estado local do agente e não deve ser enviado para repositórios, relatórios ou screenshots.

## Voltar para somente este PC

```powershell
artisys-qa-agent console lan off
```

A vinculação retorna a `127.0.0.1:4160` automaticamente.

## O que o painel mostra

- versão e estado do agente;
- heartbeat;
- bridge e Drive;
- projetos registrados e runners ativos;
- job atual;
- fluxo e etapa atual quando informados pelo runner;
- contadores de progresso;
- linha do tempo de eventos;
- screenshots, vídeos, traces, logs e relatórios encontrados no diretório de artefatos;
- histórico recente;
- stall e interrupção por reinício.

O painel é somente leitura. Não existem endpoints para shell, editar repositório, iniciar, cancelar ou repetir jobs nesta versão.

## Segurança de artefatos

O servidor de artefatos:

- exige o token do console;
- resolve caminhos de forma canônica;
- rejeita `..`, traversal e arquivos fora de `%LOCALAPPDATA%\\ArtiSys\\QA\\artifacts`;
- ignora symlinks no indexador;
- serve apenas extensões conhecidas de screenshot, vídeo, trace, relatório e log;
- usa `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` e CSP restritiva.

## Persistência local

```text
%LOCALAPPDATA%\ArtiSys\QA\telemetry\
  current.json
  events.ndjson
  jobs\<job-id>.json
```

Falha ao escrever telemetria ou abrir o console não deve alterar o resultado do QA. O QA continua sendo a fonte de verdade para o gate de release.

## Google Drive

O Drive continua sendo o arquivo final/backup dos runs. A telemetria local não substitui o uploader existente nem muda a organização por projeto/data/job.

## Cloudflare

A arquitetura prevê um adaptador opcional futuro para Cloudflare Worker + D1 + R2. Ele será outbound-only: D1 receberá estado/eventos estruturados e R2 receberá artefatos pesados. O core 2.4.0 não depende de Cloudflare para executar QA ou para o console LAN funcionar.

O bucket/catálogo R2 preparado para essa extensão é `artisysqa`. A ativação da camada cloud deve ocorrer somente após o Worker e o banco D1 terem bindings e autenticação próprios configurados.
