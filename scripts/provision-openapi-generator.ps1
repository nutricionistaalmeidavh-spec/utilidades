$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$tools = Join-Path $root '.ci-tools'
$jar = Join-Path $tools 'openapi-generator.jar'
$uri = 'https://repo.maven.apache.org/maven2/org/openapitools/openapi-generator-cli/7.16.0/openapi-generator-cli-7.16.0.jar'
$expected = '6999b18cece5b58f5d5b246fef5a43bdf61239491c4f0ed6513214e0f6e8464b'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
if (-not (Test-Path $jar)) {
  Invoke-WebRequest -Uri $uri -OutFile $jar -UseBasicParsing
}
$actual = (Get-FileHash -Path $jar -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) {
  Remove-Item $jar -Force -ErrorAction SilentlyContinue
  throw "OpenAPI generator SHA-256 invalido: $actual"
}
Write-Host "OpenAPI generator verificado: $jar"
