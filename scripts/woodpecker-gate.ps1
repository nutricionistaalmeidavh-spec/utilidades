param(
  [Parameter(Mandatory = $true)][string]$Id,
  [Parameter(Mandatory = $true)][string]$Command,
  [switch]$Final
)

$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$artifactsDir = Join-Path $root 'artifacts'
$reportPath = Join-Path $artifactsDir 'artisys-release-report.json'
$logPath = Join-Path $artifactsDir 'woodpecker-release.log'
New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null

$previousSteps = @()
$previousFailedStep = $null
if (Test-Path $reportPath) {
  try {
    $previous = Get-Content $reportPath -Raw | ConvertFrom-Json
    if ($previous.steps) { $previousSteps = @($previous.steps) }
    if ($previous.failedStep) { $previousFailedStep = [string]$previous.failedStep }
  } catch {
    $previousSteps = @()
  }
}

"=== $Id ===" | Add-Content -Path $logPath -Encoding utf8
"$Command" | Add-Content -Path $logPath -Encoding utf8
$captured = New-Object 'System.Collections.Generic.List[string]'

& cmd.exe /d /s /c $Command 2>&1 | ForEach-Object {
  $line = [string]$_
  Write-Host $line
  Add-Content -Path $logPath -Value $line -Encoding utf8
  $captured.Add($line)
}
$exitCode = $LASTEXITCODE
if ($null -eq $exitCode) { $exitCode = 0 }

$stepStatus = if ($exitCode -eq 0) { 'pass' } else { 'fail' }
$outputTail = @($captured | Select-Object -Last 200) -join [Environment]::NewLine
$step = [ordered]@{
  id = $Id
  status = $stepStatus
  exitCode = [int]$exitCode
  command = $Command
  stdout = $outputTail
  stderr = ''
}

$steps = @($previousSteps | Where-Object { $_.id -ne $Id }) + @($step)
$failedStep = if ($exitCode -ne 0) { $Id } else { $previousFailedStep }
$status = if ($exitCode -ne 0) { 'failure' } elseif ($Final) { 'pass' } else { 'running' }
$report = [ordered]@{
  status = $status
  failedStep = $failedStep
  updatedAt = (Get-Date).ToString('o')
  steps = $steps
}
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $reportPath -Encoding utf8

if ($exitCode -ne 0) { exit $exitCode }
