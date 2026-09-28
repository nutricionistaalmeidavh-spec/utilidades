param(
  [Parameter(Mandatory = $true)]
  [string]$Url
)

$ErrorActionPreference = 'Stop'

Write-Host '[ArtiSys QA Cloud] Configuring endpoint.'
& artisys-qa-agent cloud enable --url $Url
if ($LASTEXITCODE -ne 0) { throw 'Could not configure ArtiSys QA cloud endpoint.' }

Write-Host '[ArtiSys QA Cloud] Enter the same ARTISYS_QA_AGENT_TOKEN configured as a Cloudflare Worker secret.'
$secure = Read-Host 'Agent token' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ([string]::IsNullOrWhiteSpace($plain) -or $plain.Length -lt 16) {
    throw 'Agent token must contain at least 16 characters.'
  }
  [Environment]::SetEnvironmentVariable('ARTISYS_QA_CLOUD_AGENT_TOKEN', $plain, 'User')
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  $plain = $null
}

Write-Host '[ArtiSys QA Cloud] Token saved to the current Windows user environment without echoing it.'
Write-Host '[ArtiSys QA Cloud] Restarting scheduled agent so it inherits the new environment.'
try {
  Stop-ScheduledTask -TaskName 'ArtiSys QA Agent' -ErrorAction SilentlyContinue
  Start-ScheduledTask -TaskName 'ArtiSys QA Agent'
  Start-Sleep -Seconds 3
} catch {
  Write-Warning 'Automatic Task Scheduler restart failed. Log off/on or restart the ArtiSys QA Agent manually.'
}

Write-Host '[ArtiSys QA Cloud] Current cloud status:'
& artisys-qa-agent cloud status
