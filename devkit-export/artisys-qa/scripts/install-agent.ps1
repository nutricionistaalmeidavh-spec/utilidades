[CmdletBinding()]
param(
  [string]$Repository = 'https://github.com/nutricionistaalmeidavh-spec/utilidades.git',
  [string]$StableRef = 'main',
  [string]$AgentRoot = (Join-Path $env:LOCALAPPDATA 'ArtiSys\QA'),
  [string]$TaskName = 'ArtiSys QA Agent',
  [switch]$SkipChromium,
  [switch]$Repair
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "[ArtiSys QA] $Message"
}

function Assert-Command([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) { throw "Required command not found: $Name" }
  return $command.Source
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [string]$WorkingDirectory
  )
  $old = Get-Location
  try {
    if ($WorkingDirectory) { Set-Location $WorkingDirectory }
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$FilePath failed with exit code ${LASTEXITCODE}: $($Arguments -join ' ')"
    }
  } finally {
    Set-Location $old
  }
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

if ($env:OS -ne 'Windows_NT') { throw 'ArtiSys QA Agent installer supports Windows only.' }

$node = Assert-Command 'node.exe'
$npm = Assert-Command 'npm.cmd'
$npx = Assert-Command 'npx.cmd'
$git = Assert-Command 'git.exe'
$nodeMajor = [int]((& $node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -lt 22) { throw "Node.js 22+ is required. Found Node.js $nodeMajor." }

$slotsRoot = Join-Path $AgentRoot 'slots'
$slotA = Join-Path $slotsRoot 'slot-a'
$stateFile = Join-Path $AgentRoot 'agent-state.json'
$bootstrapFile = Join-Path $AgentRoot 'bootstrap.mjs'
$launcherFile = Join-Path $AgentRoot 'launcher.mjs'
$binDir = Join-Path $AgentRoot 'bin'

New-Item -ItemType Directory -Force -Path $AgentRoot, $slotsRoot, $binDir | Out-Null

$existingState = $null
$preservedProjects = @()
$preservedAutoUpdate = $true
$preservedUpdateIntervalMinutes = 60
if (Test-Path $stateFile) {
  $existingState = Get-Content $stateFile -Raw | ConvertFrom-Json
  if ($existingState.PSObject.Properties.Name -contains 'projects') { $preservedProjects = @($existingState.projects) }
  if ($existingState.PSObject.Properties.Name -contains 'autoUpdate') { $preservedAutoUpdate = [bool]$existingState.autoUpdate }
  if ($existingState.PSObject.Properties.Name -contains 'updateIntervalMinutes') { $preservedUpdateIntervalMinutes = [int]$existingState.updateIntervalMinutes }
}

if ($Repair -and (Test-Path $slotsRoot)) {
  Write-Step 'Repair requested: stopping scheduled task and rebuilding slots.'
  & schtasks.exe /End /TN $TaskName 2>$null | Out-Null
  try {
    $healthFile = Join-Path $AgentRoot 'agent-health.json'
    if (Test-Path $healthFile) {
      $health = Get-Content $healthFile -Raw | ConvertFrom-Json
      if ($health.PSObject.Properties.Name -contains 'pid' -and [int]$health.pid -gt 0) {
        & taskkill.exe /PID ([int]$health.pid) /T /F 2>$null | Out-Null
      }
    }
  } catch {}
  Remove-Item $slotsRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $slotsRoot | Out-Null
  $existingState = $null
}

if (-not $existingState) {
  Write-Step 'Resolving stable channel.'
  if (Test-Path $slotA) { Remove-Item $slotA -Recurse -Force }
  Invoke-Checked $git @('clone', '--no-checkout', $Repository, $slotA)
  Invoke-Checked $git @('-C', $slotA, 'fetch', '--quiet', 'origin', $StableRef)
  $remoteRef = 'FETCH_HEAD'
  $channelRaw = (& $git -C $slotA show "$remoteRef`:modules/artisys-qa/stable-channel.json") -join "`n"
  if ($LASTEXITCODE -ne 0) { throw 'Could not read stable-channel.json from repository.' }
  $channel = $channelRaw | ConvertFrom-Json
  if ($channel.channel -ne 'stable') { throw 'stable-channel.json must declare channel=stable.' }
  $candidateSha = (& $git -C $slotA rev-parse $remoteRef).Trim()
  if ($LASTEXITCODE -ne 0 -or $candidateSha -notmatch '^[0-9a-fA-F]{40}$') { throw 'Could not resolve stable commit.' }
  Invoke-Checked $git @('-C', $slotA, 'checkout', '--detach', $candidateSha)

  $moduleDir = Join-Path $slotA 'modules\artisys-qa'
  $package = Get-Content (Join-Path $moduleDir 'package.json') -Raw | ConvertFrom-Json
  if ($package.version -ne $channel.version) {
    throw "Stable channel version $($channel.version) does not match package version $($package.version)."
  }

  Write-Step "Installing ArtiSys QA $($package.version)."
  Invoke-Checked $npm @('ci') $moduleDir
  Write-Step 'Running module tests before installation.'
  Invoke-Checked $npm @('test') $moduleDir
  Invoke-Checked $npm @('run', 'check') $moduleDir
  if (-not $SkipChromium) {
    Write-Step 'Installing Playwright Chromium runtime.'
    Invoke-Checked $npx @('playwright', 'install', 'chromium') $moduleDir
  }

  $state = [ordered]@{
    schemaVersion = 1
    autoUpdate = $preservedAutoUpdate
    updateIntervalMinutes = $preservedUpdateIntervalMinutes
    repository = $Repository
    stableRef = $StableRef
    activeSlot = 'slot-a'
    previousSlot = $null
    projects = @($preservedProjects)
    lastUpdateCheckAt = $null
    lastUpdateResult = [ordered]@{
      status = $(if ($Repair) { 'repaired' } else { 'installed' })
      version = $package.version
      candidateSha = $candidateSha
      installedAt = (Get-Date).ToUniversalTime().ToString('o')
    }
  }
  $stateJson = $state | ConvertTo-Json -Depth 8
  Write-Utf8NoBom $stateFile $stateJson
  $activeSlot = $slotA
} else {
  $activeSlot = Join-Path $slotsRoot ([string]$existingState.activeSlot)
  if (-not (Test-Path $activeSlot)) { throw "Active slot is missing: $activeSlot. Re-run with -Repair." }
  Write-Step "Existing installation detected in $($existingState.activeSlot)."
}

$moduleScripts = Join-Path $activeSlot 'modules\artisys-qa\scripts'
Copy-Item (Join-Path $moduleScripts 'agent-bootstrap.mjs') $bootstrapFile -Force
Copy-Item (Join-Path $moduleScripts 'agent-launcher.mjs') $launcherFile -Force

$qaCmd = Join-Path $binDir 'artisys-qa.cmd'
$agentCmd = Join-Path $binDir 'artisys-qa-agent.cmd'
@"
@echo off
"$node" "$launcherFile" qa %*
"@ | Set-Content $qaCmd -Encoding ASCII
@"
@echo off
"$node" "$launcherFile" agent %*
"@ | Set-Content $agentCmd -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathParts = @($userPath -split ';' | Where-Object { $_ })
if ($pathParts -notcontains $binDir) {
  $newPath = if ($userPath) { "$binDir;$userPath" } else { $binDir }
  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}
if (($env:Path -split ';') -notcontains $binDir) { $env:Path = "$binDir;$env:Path" }

Write-Step 'Creating logon task.'
try {
  Import-Module ScheduledTasks -ErrorAction Stop
  $taskAction = New-ScheduledTaskAction -Execute $node -Argument ('"{0}"' -f $bootstrapFile)
  $taskTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $taskPrincipal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
  $taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
  $task = New-ScheduledTask -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings
  Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
} catch {
  throw "Could not create Windows Task Scheduler entry: $($_.Exception.Message)"
}

Write-Step 'Starting agent.'
try {
  Start-ScheduledTask -TaskName $TaskName
} catch {
  throw "Could not start ArtiSys QA Agent scheduled task: $($_.Exception.Message)"
}

Write-Host ''
Write-Host 'ArtiSys QA Agent installed.' -ForegroundColor Green
Write-Host "Root: $AgentRoot"
Write-Host "Task: $TaskName"
Write-Host 'Commands: artisys-qa, artisys-qa-agent'
Write-Host 'Register a project with:'
Write-Host '  artisys-qa-agent register --config C:\caminho\projeto\qa\artisys-qa.config.json'
Write-Host 'Check status with:'
Write-Host '  artisys-qa-agent status'
