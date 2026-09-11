$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'ArtiSys\QA'
$tokenFile = Join-Path $root 'cloud-read-token.dpapi'
$urlFile = Join-Path $root 'cloud-worker-url.txt'

if (-not (Test-Path $tokenFile)) {
  throw 'Encrypted reader token not found. Run setup-production.ps1 first.'
}

$encrypted = (Get-Content $tokenFile -Raw).Trim()
$secure = ConvertTo-SecureString $encrypted
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if (Test-Path $urlFile) {
    $url = (Get-Content $urlFile -Raw).Trim()
    Write-Host "Dashboard: $url"
  }
  Write-Host 'Reader token (keep private):'
  Write-Output $plain
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  $plain = $null
}
