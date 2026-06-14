$ErrorActionPreference = 'Stop'

Write-Host '=== Circular Dependency Detector ==='
Write-Host 'This script reports only; it does not modify files.'

$LocalMadge = Join-Path (Get-Location) 'node_modules/.bin/madge.cmd'
$MadgeCommand = Get-Command madge -ErrorAction SilentlyContinue

if (Test-Path $LocalMadge -PathType Leaf) {
  & $LocalMadge --circular --extensions ts,tsx,js,jsx src backend/src lib
  exit $LASTEXITCODE
}

if ($MadgeCommand) {
  & madge --circular --extensions ts,tsx,js,jsx src backend/src lib
  exit $LASTEXITCODE
}

Write-Host 'madge is not installed in this repo and no global madge command was found.'
Write-Host 'Skipped deep circular analysis to avoid adding dependencies during a safe audit.'
Write-Host 'Suggested optional command after approval: npx madge --circular --extensions ts,tsx,js,jsx src backend/src lib'
