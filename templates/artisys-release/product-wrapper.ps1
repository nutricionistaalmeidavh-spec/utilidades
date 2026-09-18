param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProductRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LockPath = Join-Path $ProductRoot '.artisys\utilidades.lock'
$ReleaseConfig = Join-Path $ProductRoot '.artisys\release.json'
$ArtifactsDir = Join-Path $ProductRoot 'artifacts'
$QaArtifactsDir = Join-Path $ProductRoot 'qa-artifacts'
$ReportPath = Join-Path $ArtifactsDir 'artisys-release-report.json'
$LogPath = Join-Path $ArtifactsDir 'woodpecker-release.log'
$ReleaseRunPath = Join-Path $QaArtifactsDir 'release-run.json'
$DryRunPath = Join-Path $QaArtifactsDir 'release-run-dry-run.json'
$InstallerDir = if ($env:ARTISYS_INSTALLER_DIR) { $env:ARTISYS_INSTALLER_DIR } else { Join-Path $ProductRoot 'release' }
$InstallerPattern = if ($env:ARTISYS_INSTALLER_PATTERN) { $env:ARTISYS_INSTALLER_PATTERN } else { 'Setup-.*\.exe$' }
$StatusContext = if ($env:ARTISYS_STATUS_CONTEXT) { $env:ARTISYS_STATUS_CONTEXT } else { 'ci/woodpecker/artisys-release' }

if (-not (Test-Path $LockPath)) { throw "Lock ausente: $LockPath" }
if (-not (Test-Path $ReleaseConfig)) { throw "Config ausente: $ReleaseConfig" }
if (-not $env:ARTISYS_UTILIDADES_PATH) { throw 'ARTISYS_UTILIDADES_PATH nao configurado no host.' }

$UtilidadesPath = (Resolve-Path $env:ARTISYS_UTILIDADES_PATH).Path
$Lock = Get-Content $LockPath -Raw | ConvertFrom-Json
$PinnedCommit = [string]$Lock.commit
if ($PinnedCommit -notmatch '^[0-9a-f]{40}$') { throw 'Commit pinado de utilidades invalido.' }

$inside = & git -C $UtilidadesPath rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or $inside.Trim() -ne 'true') { throw "ARTISYS_UTILIDADES_PATH nao e repositorio git: $UtilidadesPath" }
& git -C $UtilidadesPath cat-file -e "$PinnedCommit^{commit}" 2>$null
if ($LASTEXITCODE -ne 0) { throw "Commit pinado $PinnedCommit nao existe no checkout local de utilidades. Atualize o clone explicitamente; nao ha fallback para main." }

$ProductCommit = (& git -C $ProductRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $ProductCommit -notmatch '^[0-9a-f]{40}$') { throw 'Nao foi possivel resolver o HEAD do produto.' }

New-Item -ItemType Directory -Force -Path $ArtifactsDir,$QaArtifactsDir | Out-Null
if (-not $DryRun) {
  Remove-Item $ReportPath,$LogPath,$ReleaseRunPath -Force -ErrorAction SilentlyContinue
  if (Test-Path $InstallerDir) {
    Get-ChildItem $InstallerDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match $InstallerPattern } | Remove-Item -Force
  }
}

$TempWorktree = Join-Path ([IO.Path]::GetTempPath()) ("artisys-utilidades-{0}-{1}" -f $PID,[guid]::NewGuid().ToString('N'))
$WorktreeCreated = $false
$ReleaseExit = 1
$ReporterExit = 1
$StartedAt = (Get-Date).ToUniversalTime().ToString('o')

try {
  & git -C $UtilidadesPath worktree add --detach $TempWorktree $PinnedCommit
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar worktree pinado de utilidades.' }
  $WorktreeCreated = $true

  $ReleaseCli = Join-Path $TempWorktree 'modules\artisys-release\bin\artisys-release.mjs'
  $ReporterCli = Join-Path $TempWorktree 'modules\artisys-ci-reporter\bin\artisys-ci-reporter.mjs'
  if (-not (Test-Path $ReleaseCli)) { throw 'artisys-release ausente no commit pinado.' }
  if (-not (Test-Path $ReporterCli)) { throw 'artisys-ci-reporter ausente no commit pinado.' }

  $ReleaseArgs = @($ReleaseCli,$ReleaseConfig,'--profile','release','--report',$ReportPath)
  if ($DryRun) { $ReleaseArgs += '--dry-run' }

  Push-Location $ProductRoot
  try {
    & node @ReleaseArgs *>&1 | Tee-Object -FilePath $LogPath
    $ReleaseExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }

  $FinishedAt = (Get-Date).ToUniversalTime().ToString('o')
  $Installer = $null
  if (Test-Path $InstallerDir) {
    $Installer = Get-ChildItem $InstallerDir -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match $InstallerPattern } |
      Sort-Object LastWriteTimeUtc -Descending |
      Select-Object -First 1
  }

  if ($DryRun) {
    @{
      status = if ($ReleaseExit -eq 0) { 'dry-run' } else { 'failed' }
      dryRun = $true
      commit = $ProductCommit
      utilidadesCommit = $PinnedCommit
      startedAt = $StartedAt
      finishedAt = $FinishedAt
    } | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $DryRunPath
    exit $ReleaseExit
  }

  if ($ReleaseExit -eq 0 -and -not $Installer) {
    $ReleaseExit = 1
    Add-Content $LogPath '[wrapper] pipeline retornou sucesso, mas nenhum instalador correspondente foi encontrado.'
  }

  $InstallerRecord = $null
  if ($Installer) {
    $InstallerRecord = @{
      name = $Installer.Name
      path = $Installer.FullName
      size = $Installer.Length
      mtime = $Installer.LastWriteTimeUtc.ToString('o')
      sha256 = (Get-FileHash -Algorithm SHA256 $Installer.FullName).Hash.ToLowerInvariant()
    }
  }

  @{
    status = if ($ReleaseExit -eq 0) { 'passed' } else { 'failed' }
    commit = $ProductCommit
    utilidadesCommit = $PinnedCommit
    startedAt = $StartedAt
    finishedAt = $FinishedAt
    installer = $InstallerRecord
  } | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $ReleaseRunPath

  $env:ARTISYS_REPORT_PATH = $ReportPath
  $env:ARTISYS_LOG_PATH = $LogPath
  $env:ARTISYS_INSTALLER_DIR = $InstallerDir
  $env:ARTISYS_INSTALLER_PATTERN = $InstallerPattern
  $env:ARTISYS_STATUS_CONTEXT = $StatusContext
  $env:ARTISYS_CI_RESULT = if ($ReleaseExit -eq 0) { 'success' } else { 'failure' }

  & node $ReporterCli
  $ReporterExit = $LASTEXITCODE

  if ($ReleaseExit -ne 0) { exit $ReleaseExit }
  if ($ReporterExit -ne 0) { exit $ReporterExit }
  exit 0
}
finally {
  if ($WorktreeCreated) {
    & git -C $UtilidadesPath worktree remove $TempWorktree 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Warning "Nao foi possivel remover automaticamente o worktree temporario: $TempWorktree" }
    & git -C $UtilidadesPath worktree prune 2>$null
  }
}
