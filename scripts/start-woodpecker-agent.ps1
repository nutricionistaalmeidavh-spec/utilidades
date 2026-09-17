param(
  [Parameter(Mandatory = $true)][string]$Server,
  [Parameter(Mandatory = $true)][string]$AgentSecret,
  [string]$AgentExecutable = "woodpecker-agent",
  [int]$MaxWorkflows = 1
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command $AgentExecutable -ErrorAction SilentlyContinue)) {
  throw "woodpecker-agent nao encontrado no PATH. Instale o binario oficial Windows antes de executar este script."
}

$env:WOODPECKER_SERVER = $Server
$env:WOODPECKER_AGENT_SECRET = $AgentSecret
$env:WOODPECKER_BACKEND = "local"
$env:WOODPECKER_MAX_WORKFLOWS = [string]$MaxWorkflows

Write-Host "Iniciando Woodpecker agent com backend local em $Server"
Write-Host "Os comandos do pipeline serao executados diretamente neste Windows. Use apenas repositorios confiaveis."

& $AgentExecutable
exit $LASTEXITCODE
