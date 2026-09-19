$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$artifactsDir = Join-Path $repoRoot 'artifacts'
$reportPath = Join-Path $artifactsDir 'artisys-release-report.json'
$logPath = Join-Path $artifactsDir 'woodpecker-release.log'
$configPath = Join-Path $repoRoot '.artisys\p0-p1-validation.json'
$engine = Join-Path $repoRoot 'modules\artisys-release\bin\artisys-release.mjs'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
[IO.File]::WriteAllText($logPath, "=== RepoUteis P0/P1 ===`r`n", $utf8NoBom)

function Write-FallbackReport {
  param(
    [string]$Message,
    [int]$ExitCode = 1,
    [string]$Stdout = '',
    [string]$Step = 'bootstrap'
  )
  $report = [ordered]@{
    product = 'utilidades-rag-quality'
    version = 'p0-p1'
    profile = 'quick'
    status = 'blocked'
    failedStep = $Step
    metadata = @{ purpose = 'P0/P1 reusable modules validation' }
    steps = @([ordered]@{
      id = $Step
      status = 'fail'
      command = 'scripts/run-p0-p1-ci.ps1'
      exitCode = $ExitCode
      reason = $Message
      stdout = $Stdout
      stderr = $Message
    })
  }
  [IO.File]::WriteAllText($reportPath, ($report | ConvertTo-Json -Depth 8) + "`n", $utf8NoBom)
}

# Crie evidência antes de qualquer dependência externa; se o bootstrap morrer depois
# deste ponto, o reporter ainda consegue publicar a causa no GitHub.
Write-FallbackReport -Message 'Bootstrap iniciado; artisys-release ainda não concluiu.' -ExitCode 1

$captured = New-Object 'System.Collections.Generic.List[string]'
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js não encontrado no PATH do Woodpecker Agent.'
  }
  if (-not (Test-Path $engine)) {
    throw "artisys-release não encontrado: $engine"
  }
  if (-not (Test-Path $configPath)) {
    throw "Configuração P0/P1 não encontrada: $configPath"
  }

  "[RepoUteis CI] node: $(& node --version)" | Tee-Object -FilePath $logPath -Append | Write-Host
  "[RepoUteis CI] engine: $engine" | Tee-Object -FilePath $logPath -Append | Write-Host
  "[RepoUteis CI] config: $configPath" | Tee-Object -FilePath $logPath -Append | Write-Host

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & node $engine $configPath --profile quick --report $reportPath *>&1 | ForEach-Object {
      $line = [string]$_
      $captured.Add($line)
      Write-Host $line
      [IO.File]::AppendAllText($logPath, $line + "`r`n", $utf8NoBom)
    }
    $code = if ($null -eq $LASTEXITCODE) { 1 } else { [int]$LASTEXITCODE }
  } finally {
    $ErrorActionPreference = $previousPreference
  }

  if (-not (Test-Path $reportPath)) {
    Write-FallbackReport -Message "artisys-release terminou sem gerar relatório (exit $code)." -ExitCode $code -Stdout (($captured | Select-Object -Last 200) -join "`n") -Step 'artisys-release'
    exit $(if ($code -eq 0) { 1 } else { $code })
  }

  # O engine substitui o fallback pelo relatório estruturado. Se ele falhar,
  # preserve o exit code para o Woodpecker acionar o reporter de falha.
  if ($code -ne 0) { exit $code }

  $report = Get-Content $reportPath -Raw | ConvertFrom-Json
  if ($report.status -ne 'pass') {
    exit 1
  }
  exit 0
} catch {
  $message = $_.Exception.Message
  [IO.File]::AppendAllText($logPath, "[RepoUteis CI] ERRO: $message`r`n", $utf8NoBom)
  Write-FallbackReport -Message $message -ExitCode 1 -Stdout (($captured | Select-Object -Last 200) -join "`n")
  Write-Error $message
  exit 1
}
