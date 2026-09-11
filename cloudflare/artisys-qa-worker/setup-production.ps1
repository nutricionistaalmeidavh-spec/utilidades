param(
  [switch]$SkipDeploy,
  [switch]$SkipAgentLink
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
  }
}

function New-RandomToken {
  param([int]$Bytes = 48)
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($buffer)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Put-WorkerSecret {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )
  $Value | & npx wrangler secret put $Name --config wrangler.jsonc
  if ($LASTEXITCODE -ne 0) {
    throw "Could not configure Worker secret $Name."
  }
}

function Save-ReaderTokenProtected {
  param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$WorkerUrl
  )
  $root = Join-Path $env:LOCALAPPDATA 'ArtiSys\QA'
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  $secure = ConvertTo-SecureString $Token -AsPlainText -Force
  $encrypted = ConvertFrom-SecureString $secure
  Set-Content -Path (Join-Path $root 'cloud-read-token.dpapi') -Value $encrypted -Encoding UTF8
  if ($WorkerUrl) {
    Set-Content -Path (Join-Path $root 'cloud-worker-url.txt') -Value $WorkerUrl -Encoding UTF8
  }
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'Node/npm is required.'
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx is required.'
}
if (-not (Test-Path '.\wrangler.jsonc')) {
  throw 'wrangler.jsonc is missing.'
}

Write-Host '[ArtiSys QA Cloud] Installing/refreshing Wrangler dependencies.'
Invoke-Checked 'npm' @('install', '--no-audit', '--no-fund')

Write-Host '[ArtiSys QA Cloud] Checking Cloudflare login.'
& npx wrangler whoami --config wrangler.jsonc | Out-Host
if ($LASTEXITCODE -ne 0) {
  Write-Host '[ArtiSys QA Cloud] Opening Cloudflare authorization.'
  Invoke-Checked 'npx' @('wrangler', 'login')
  Invoke-Checked 'npx' @('wrangler', 'whoami', '--config', 'wrangler.jsonc')
}

Write-Host '[ArtiSys QA Cloud] Generating separate write/read credentials locally.'
$agentToken = New-RandomToken
$readToken = New-RandomToken

Write-Host '[ArtiSys QA Cloud] Configuring encrypted Worker secrets (values are not printed).'
Put-WorkerSecret 'ARTISYS_QA_AGENT_TOKEN' $agentToken
Put-WorkerSecret 'ARTISYS_QA_READ_TOKEN' $readToken

Write-Host '[ArtiSys QA Cloud] Applying D1 migrations to artisysqa.'
Invoke-Checked 'npx' @('wrangler', 'd1', 'migrations', 'apply', 'artisysqa', '--remote', '--config', 'wrangler.jsonc')

$workerUrl = $null
if (-not $SkipDeploy) {
  Write-Host '[ArtiSys QA Cloud] Deploying Worker utilidades.'
  $deployOutput = & npx wrangler deploy --config wrangler.jsonc 2>&1
  $deployCode = $LASTEXITCODE
  $deployOutput | ForEach-Object { Write-Host $_ }
  if ($deployCode -ne 0) {
    throw "Worker deploy failed with exit code $deployCode."
  }
  $match = [regex]::Match(($deployOutput -join "`n"), 'https://[A-Za-z0-9._-]+\.workers\.dev')
  if ($match.Success) {
    $workerUrl = $match.Value.TrimEnd('/')
  }
}

if (-not $workerUrl) {
  Write-Host '[ArtiSys QA Cloud] Could not infer workers.dev URL automatically.'
  $entered = Read-Host 'Paste the Worker URL (or press Enter to configure the agent later)'
  if (-not [string]::IsNullOrWhiteSpace($entered)) {
    $workerUrl = $entered.Trim().TrimEnd('/')
  }
}

Write-Host '[ArtiSys QA Cloud] Saving read token encrypted with Windows DPAPI for the current user.'
Save-ReaderTokenProtected -Token $readToken -WorkerUrl $workerUrl

if (-not $SkipAgentLink) {
  if (Get-Command artisys-qa-agent -ErrorAction SilentlyContinue) {
    Write-Host '[ArtiSys QA Cloud] Saving the agent write token in the current Windows user environment.'
    [Environment]::SetEnvironmentVariable('ARTISYS_QA_CLOUD_AGENT_TOKEN', $agentToken, 'User')
    if ($workerUrl) {
      Write-Host '[ArtiSys QA Cloud] Linking the Windows QA Agent to the Worker.'
      & artisys-qa-agent cloud enable --url $workerUrl
      if ($LASTEXITCODE -ne 0) {
        throw 'Could not enable Cloudflare mirroring in ArtiSys QA Agent.'
      }
      try {
        Stop-ScheduledTask -TaskName 'ArtiSys QA Agent' -ErrorAction SilentlyContinue
        Start-ScheduledTask -TaskName 'ArtiSys QA Agent'
        Start-Sleep -Seconds 3
      } catch {
        Write-Warning 'Could not restart the scheduled QA agent automatically. Log off/on or restart the agent manually.'
      }
    } else {
      Write-Warning 'Worker URL is not known yet. The write token is saved; run artisys-qa-agent cloud enable --url <URL> after deployment.'
    }
  } else {
    Write-Warning 'artisys-qa-agent is not available in this shell. Cloudflare is configured, but link the Windows Agent after it updates to 2.4.1.'
  }
}

$agentToken = $null
$readToken = $null

Write-Host ''
Write-Host 'ArtiSys QA Cloud production setup completed.'
Write-Host 'Worker: utilidades'
Write-Host 'D1: artisysqa (DB)'
Write-Host 'R2: artisysqa (R2)'
if ($workerUrl) { Write-Host "URL: $workerUrl" }
Write-Host 'Reader credential was saved encrypted for this Windows user.'
Write-Host 'Use show-reader-token.ps1 only when you need to open the private dashboard.'
