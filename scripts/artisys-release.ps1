param(
  [Parameter(Mandatory = $false)][string]$Config = ".artisys/release.json",
  [ValidateSet("quick", "full", "release")][string]$Profile = "release",
  [switch]$DryRun,
  [string]$Report = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 22+ nao encontrado no PATH."
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Cli = Join-Path $RepoRoot "modules/artisys-release/bin/artisys-release.mjs"
$CallerRoot = (Get-Location).Path
$ConfigPath = if ([System.IO.Path]::IsPathRooted($Config)) { $Config } else { Join-Path $CallerRoot $Config }
$ConfigPath = (Resolve-Path $ConfigPath).Path

$ArgsList = @($Cli, $ConfigPath, "--profile", $Profile)
if ($DryRun) { $ArgsList += "--dry-run" }
if ($Report) {
  $ReportPath = if ([System.IO.Path]::IsPathRooted($Report)) { $Report } else { Join-Path $CallerRoot $Report }
  $ArgsList += @("--report", $ReportPath)
}

Push-Location $RepoRoot
try {
  & node @ArgsList
  $ExitCode = $LASTEXITCODE
}
finally {
  Pop-Location
}

exit $ExitCode
