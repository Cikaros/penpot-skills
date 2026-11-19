param(
  [string]$TargetRoot = (Join-Path $env:USERPROFILE ".sclaw\agent\skills")
)

$dest = Join-Path $TargetRoot "penpot-mcp"
$errors = @()

if (-not (Test-Path $dest)) {
  throw "skill not installed: $dest`nRun .\scripts\install-skill.ps1 first."
}

$skill = Join-Path $dest "SKILL.md"
if (-not (Test-Path $skill)) {
  $errors += "missing SKILL.md"
} else {
  $head = (Get-Content $skill -TotalCount 20) -join "`n"
  if ($head -notmatch "(?m)^name:\s*penpot-mcp\s*$") {
    $errors += "SKILL.md frontmatter name is not penpot-mcp"
  }
  if ($head -notmatch "(?m)^description:\s*\S+") {
    $errors += "SKILL.md frontmatter description is missing"
  }
}

$references = @(
  "references\api-pitfalls.md",
  "references\auth-and-transport.md",
  "references\design-workflow.md",
  "references\screen-kit.md",
  "references\recipes.md"
)
foreach ($item in $references) {
  if (-not (Test-Path (Join-Path $dest $item))) {
    $errors += "missing $item"
  }
}

$versionFile = Join-Path $dest ".penpot-skills-version"
$installed = if (Test-Path $versionFile) { (Get-Content $versionFile -Raw).Trim() } else { "unknown" }
$current = (Get-Content (Join-Path (Split-Path -Parent $PSScriptRoot) "package.json") -Raw | ConvertFrom-Json).version

$manifestFile = Join-Path $dest "manifest.json"
if (-not (Test-Path $manifestFile)) {
  $errors += "missing manifest.json"
} else {
  $manifest = Get-Content $manifestFile -Raw | ConvertFrom-Json
  if ($manifest.version -ne $current) {
    $errors += "manifest version $($manifest.version) differs from repo $current"
  }
  foreach ($file in $manifest.files) {
    $local = Join-Path $dest ($file.path -replace "/", "\")
    if (-not (Test-Path $local)) {
      $errors += "manifest file missing: $($file.path)"
      continue
    }
    $text = [IO.File]::ReadAllText($local, [Text.Encoding]::UTF8).Replace([string][char]0xFEFF, "").Replace("`r`n", "`n")
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
      $actual = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($text)))).Replace("-", "").ToLowerInvariant()
    } finally {
      $sha.Dispose()
    }
    if ($actual -ne $file.sha256) {
      $errors += "manifest hash mismatch: $($file.path)"
    }
  }
}

Write-Host "path:      $dest"
Write-Host "version:   $installed (repo: $current)"
if ($installed -ne $current) {
  Write-Host "warning:   installed version differs from repo version; reinstall with -Force if intended"
}

if ($errors.Count -gt 0) {
  Write-Host "status:    FAILED"
  foreach ($item in $errors) { Write-Host "  - $item" }
  exit 1
}

Write-Host "status:    OK"
exit 0
