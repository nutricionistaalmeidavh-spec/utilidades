# ArtiSys Windows CI 0.1.0

Gate compartilhado para execucao privilegiada de CI nos computadores Windows da ArtiSys.

## Objetivo

Evitar que apenas um label de Woodpecker seja suficiente para autorizar comandos administrativos. O modulo valida o repositorio, bloqueia eventos de pull request e exige a identidade esperada do Agent elevado antes de o produto executar seus comandos.

## Allowlist inicial

- `nutricionistaalmeidavh-spec/OBRANAMAOCOMERCIAL`
- `nutricionistaalmeidavh-spec/PDV-ARTISYS`
- `nutricionistaalmeidavh-spec/OficinaAgricola`
- `nutricionistaalmeidavh-spec/SistemaLavoura`
- `nutricionistaalmeidavh-spec/frota-e-manutencao`
- `nutricionistaalmeidavh-spec/pecuaria`
- `nutricionistaalmeidavh-spec/maquinasagricolas`

Alteracoes da allowlist sao feitas por codigo neste modulo; pipeline de produto nao pode ampliar a lista por variavel de ambiente.

## Uso

O Agent elevado deve herdar:

```text
ARTISYS_AGENT_PRIVILEGE=elevated
ARTISYS_AGENT_OWNER=artisys
ARTISYS_AGENT_PLATFORM=windows/amd64
```

No pipeline:

```powershell
node "$env:ARTISYS_UTILIDADES_PATH\modules\artisys-windows-ci\bin\artisys-windows-ci.mjs" verify-elevated
if ($LASTEXITCODE -ne 0) { throw 'Contexto elevado nao autorizado.' }
```

O comando falha para repositorios fora da allowlist e para `pull_request`.

## Verificacao

```powershell
Set-Location modules/artisys-windows-ci
npm test
npm run check
```
