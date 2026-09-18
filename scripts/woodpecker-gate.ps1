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

$cmdFile = Join-Path $artifactsDir ("gate-{0}.cmd" -f ($Id -replace '[^A-Za-z0-9_.-]','_'))
$stdoutFile = "$cmdFile.stdout.log"
$stderrFile = "$cmdFile.stderr.log"
@('@echo off', $Command) | Set-Content -Path $cmdFile -Encoding ascii

$process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d','/s','/c',"`"$cmdFile`"") -WorkingDirectory $root -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
$exitCode = [int]$process.ExitCode
$stdout = if (Test-Path $stdoutFile) { Get-Content $stdoutFile -Raw -ErrorAction SilentlyContinue } else { '' }
$stderr = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw -ErrorAction SilentlyContinue } else { '' }
if ($stdout) { Write-Host $stdout; Add-Content -Path $logPath -Value $stdout -Encoding utf8 }
if ($stderr) { Write-Host $stderr; Add-Content -Path $logPath -Value $stderr -Encoding utf8 }

$combined = @($stdout, $stderr) -join [Environment]::NewLine
$tailLines = @($combined -split '\r?\n' | Select-Object -Last 200) -join [Environment]::NewLine
$stepStatus = if ($exitCode -eq 0) { 'pass' } else { 'fail' }
$step = [ordered]@{
  id = $Id
  status = $stepStatus
  exitCode = $exitCode
  command = $Command
  stdout = $tailLines
  stderr = if ($exitCode -ne 0) { $stderr } else { '' }
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

Remove-Item $cmdFile,$stdoutFile,$stderrFile -Force -ErrorAction SilentlyContinue
if ($exitCode -ne 0) { exit $exitCode }
