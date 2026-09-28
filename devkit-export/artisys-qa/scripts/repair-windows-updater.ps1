[CmdletBinding()]
param(
  [string]$AgentRoot = (Join-Path $env:LOCALAPPDATA 'ArtiSys\QA')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($env:OS -ne 'Windows_NT') { throw 'This recovery script is Windows-only.' }

$stateFile = Join-Path $AgentRoot 'agent-state.json'
if (-not (Test-Path $stateFile)) { throw "ArtiSys QA Agent state not found at $stateFile" }

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$activeSlot = [string]$state.activeSlot
if (-not $activeSlot) { $activeSlot = 'slot-a' }

$source = Join-Path (Split-Path $PSScriptRoot -Parent) 'src\agent-updater.js'
$target = Join-Path $AgentRoot "slots\$activeSlot\modules\artisys-qa\src\agent-updater.js"
if (-not (Test-Path $source)) { throw "Fixed updater source not found at $source" }
if (-not (Test-Path $target)) { throw "Installed updater not found at $target" }

$node = (Get-Command node.exe -ErrorAction Stop).Source
& $node --check $source
if ($LASTEXITCODE -ne 0) { throw 'Fixed updater failed Node syntax validation.' }

$backup = "$target.pre-einval-fix"
if (-not (Test-Path $backup)) { Copy-Item $target $backup -Force }
Copy-Item $source $target -Force

Write-Host '[ArtiSys QA] Windows updater EINVAL hotfix applied.' -ForegroundColor Green
Write-Host "Active slot: $activeSlot"

$agent = Join-Path $AgentRoot 'bin\artisys-qa-agent.cmd'
if (-not (Test-Path $agent)) { throw "Agent launcher not found at $agent" }

Write-Host '[ArtiSys QA] Retrying stable update.'
& $agent check-update
if ($LASTEXITCODE -ne 0) {
  throw 'Updater hotfix was applied, but the stable update still failed. Keep the output above for diagnosis.'
}
