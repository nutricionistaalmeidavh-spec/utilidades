param(
  [Parameter(Mandatory = $true)]
  [string]$Endpoint,
  [string]$TokenEnv = "ARTISYS_QA_CLOUD_AGENT_TOKEN"
)

$ErrorActionPreference = "Stop"

if ($Endpoint -notmatch '^https://') {
  throw "Endpoint must start with https://"
}
if ($TokenEnv -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
  throw "Invalid environment variable name"
}

$command = Get-Command artisys-qa-agent -ErrorAction SilentlyContinue
if (-not $command) {
  throw "artisys-qa-agent is not available in PATH. Install/update ArtiSys QA first."
}

Write-Host "ArtiSys QA Cloud setup"
Write-Host "Endpoint: $Endpoint"
Write-Host "Token variable: $TokenEnv"
Write-Host "The token will be stored in the current Windows user's environment, never in agent-state.json."

$secure = Read-Host "Paste the Cloudflare ARTISYS_QA_AGENT_TOKEN" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if ([string]::IsNullOrWhiteSpace($plain)) { throw "Token cannot be empty" }
  [Environment]::SetEnvironmentVariable($TokenEnv, $plain, "User")
  Set-Item -Path "Env:$TokenEnv" -Value $plain
  & artisys-qa-agent cloud enable --endpoint $Endpoint --token-env $TokenEnv
  & artisys-qa-agent cloud test
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Variable plain -ErrorAction SilentlyContinue
}

Write-Host "Cloud mirror configured. The background agent will pick it up after restart/update."
