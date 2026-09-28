[CmdletBinding()]
param(
  [string]$RemoteName = 'artisys-qa-drive',
  [string]$RootFolderId = '1mb4R9Robq18JSXMxZiboOitoIjtYL70O',
  [string]$ClientId = $env:ARTISYS_GOOGLE_CLIENT_ID,
  [string]$ClientSecret = $env:ARTISYS_GOOGLE_CLIENT_SECRET,
  [switch]$AllowSharedRcloneClient
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "[ArtiSys QA Drive] $Message"
}

$rclone = Get-Command 'rclone.exe' -ErrorAction SilentlyContinue
if (-not $rclone) {
  $winget = Get-Command 'winget.exe' -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw 'rclone is not installed and winget is unavailable. Install rclone and run this script again.'
  }
  Write-Step 'Installing rclone with winget.'
  & $winget.Source install --id Rclone.Rclone -e --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw "winget failed with exit code ${LASTEXITCODE}." }
  $rclone = Get-Command 'rclone.exe' -ErrorAction SilentlyContinue
  if (-not $rclone) {
    $candidate = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\rclone.exe'
    if (Test-Path $candidate) { $rclone = Get-Item $candidate }
  }
  if (-not $rclone) { throw 'rclone was installed but is not visible yet. Open a new PowerShell and run this script again.' }
}

if ((-not $ClientId -or -not $ClientSecret) -and -not $AllowSharedRcloneClient) {
  throw @'
Google OAuth Desktop credentials are required for durable Drive uploads.
Set ARTISYS_GOOGLE_CLIENT_ID and ARTISYS_GOOGLE_CLIENT_SECRET, or pass -ClientId and -ClientSecret.
The rclone shared Google client is intentionally not used by default because it is being retired during 2026.
'@
}

Write-Step "Configuring Google Drive remote '$RemoteName'. A browser window may open for Google authorization."
$configArgs = @('config', 'create', $RemoteName, 'drive', 'scope', 'drive', 'root_folder_id', $RootFolderId)
if ($ClientId -and $ClientSecret) {
  $configArgs += @('client_id', $ClientId, 'client_secret', $ClientSecret)
}
& $rclone.Source @configArgs
if ($LASTEXITCODE -ne 0) {
  throw "rclone Google Drive configuration failed with exit code ${LASTEXITCODE}."
}

Write-Step 'Checking Drive access.'
& $rclone.Source lsd "${RemoteName}:" --max-depth 1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Configured rclone remote could not access the QA Drive folder.' }

$agent = Join-Path $env:LOCALAPPDATA 'ArtiSys\QA\bin\artisys-qa-agent.cmd'
if (-not (Test-Path $agent)) { throw "ArtiSys QA Agent command not found at $agent" }

Write-Step 'Enabling Drive uploads in ArtiSys QA Agent.'
& $agent drive enable --remote $RemoteName --root-folder-id $RootFolderId
if ($LASTEXITCODE -ne 0) { throw 'Could not enable Drive uploads in ArtiSys QA Agent.' }

Write-Host ''
Write-Host 'Google Drive artifact upload configured.' -ForegroundColor Green
Write-Host "Remote: $RemoteName"
Write-Host "Drive root folder ID: $RootFolderId"
Write-Host 'Each project will use a stable folder named with its projectId.'
