param(
  [string]$ReportPath = '.\artifacts\artisys-release-report.json',
  [string]$LogPath = '.\artifacts\woodpecker-release.log'
)

$ErrorActionPreference = 'Stop'
$workspace = (Get-Location).Path
$reportFull = [IO.Path]::GetFullPath((Join-Path $workspace $ReportPath))
$logFull = [IO.Path]::GetFullPath((Join-Path $workspace $LogPath))
$artifactDir = Split-Path -Parent $reportFull
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

$stdoutPath = Join-Path $artifactDir 'artisys-release.stdout.log'
$stderrPath = Join-Path $artifactDir 'artisys-release.stderr.log'
Remove-Item $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

function Write-CapturedLines {
  param([string]$Path, [string]$Prefix)
  if (-not (Test-Path $Path)) { return '' }
  $text = Get-Content $Path -Raw -ErrorAction SilentlyContinue
  if (-not [string]::IsNullOrWhiteSpace($text)) {
    $text -split "`r?`n" | Where-Object { $_ -ne '' } | ForEach-Object {
      $line = if ($Prefix) { "$Prefix$_" } else { $_ }
      Write-Host $line
      Add-Content -Path $logFull -Value $line -Encoding utf8
    }
  }
  return $text
}

$commandText = 'node modules/artisys-release/bin/artisys-release.mjs .artisys/release.json --profile full --report artifacts/artisys-release-report.json'
$bootstrapError = $null
$exitCode = 1

try {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  $arguments = @(
    'modules/artisys-release/bin/artisys-release.mjs',
    '.artisys/release.json',
    '--profile', 'full',
    '--report', 'artifacts/artisys-release-report.json'
  )

  "=== artisys-release full ===" | Add-Content -Path $logFull -Encoding utf8
  "[self-ci] command: $commandText" | Add-Content -Path $logFull -Encoding utf8
  $process = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $workspace -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  $exitCode = $process.ExitCode
} catch {
  $bootstrapError = $_.Exception.ToString()
  $exitCode = 1
}

$stdout = Write-CapturedLines -Path $stdoutPath -Prefix '[stdout] '
$stderr = Write-CapturedLines -Path $stderrPath -Prefix '[stderr] '
if ($bootstrapError) {
  Write-Host "[bootstrap] $bootstrapError"
  Add-Content -Path $logFull -Value "[bootstrap] $bootstrapError" -Encoding utf8
}

if (-not (Test-Path $reportFull)) {
  if ($exitCode -eq 0) { $exitCode = 1 }
  $fallbackError = if ($bootstrapError) { $bootstrapError } elseif (-not [string]::IsNullOrWhiteSpace($stderr)) { $stderr } elseif (-not [string]::IsNullOrWhiteSpace($stdout)) { $stdout } else { 'artisys-release terminou sem gerar o relatorio.' }
  $fallback = [ordered]@{
    product = 'utilidades'
    version = 'dev'
    profile = 'full'
    status = 'blocked'
    failedStep = 'bootstrap'
    metadata = [ordered]@{ purpose = 'self-validation of shared ArtiSys modules'; source = 'woodpecker-bootstrap-fallback' }
    steps = @(
      [ordered]@{
        id = 'bootstrap'
        status = 'fail'
        command = $commandText
        exitCode = $exitCode
        reason = 'release-report-not-generated'
        stdout = $stdout
        stderr = $fallbackError
      }
    )
  }
  $fallback | ConvertTo-Json -Depth 8 | Set-Content -Path $reportFull -Encoding utf8
  Add-Content -Path $logFull -Value '[self-ci] fallback report generated for bootstrap failure.' -Encoding utf8
}

if ($exitCode -ne 0) {
  throw "artisys-release falhou com codigo $exitCode. Consulte $reportFull, $stdoutPath e $stderrPath."
}

$report = Get-Content $reportFull -Raw | ConvertFrom-Json
if ($report.status -ne 'pass') {
  throw "artisys-release terminou com status $($report.status). Consulte $reportFull."
}

Write-Host '[self-ci] artisys-release aprovado.'
