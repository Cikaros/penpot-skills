param(
  [string]$TargetRoot = (Join-Path $env:USERPROFILE ".sclaw\agent\skills"),
  [switch]$Force
)

$repo = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repo "skills\penpot-mcp"
$dest = Join-Path $TargetRoot "penpot-mcp"

if (-not (Test-Path $source)) {
  throw "skill source not found: $source"
}

if (Test-Path $dest) {
  if (-not $Force) {
    throw "target already exists: $dest`nUse -Force to back up and replace it."
  }
  $backup = "$dest.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Move-Item -Path $dest -Destination $backup
  Write-Host "backup: $backup"
}

New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null
Copy-Item -Path $source -Destination $dest -Recurse

$version = (Get-Content (Join-Path $repo "package.json") -Raw | ConvertFrom-Json).version
Set-Content -Path (Join-Path $dest ".penpot-skills-version") -Value $version -Encoding utf8

Write-Host "installed: $dest"
Write-Host "version:   $version"
Write-Host "next:      .\scripts\doctor.ps1"
