$ErrorActionPreference = 'Stop'

Write-Host '=== CareDroid Emergency OS Cleanup ==='
Write-Host 'Auditing non-emergency modules...'

$BackendDir = './backend/src'
$FrontendDir = './src'

$PatternsToRemove = @(
  'ICU',
  'Lab',
  'Research',
  'Education',
  'Fleet',
  'IoT',
  'DigitalTwin',
  'Digital_Twin',
  'Digital Twin',
  'Governance',
  'CommandCenter',
  'Command_Center',
  'Command Center',
  'Enterprise Command'
)

$DirsToDelete = @(
  "$BackendDir/modules/icu",
  "$BackendDir/modules/lab",
  "$BackendDir/modules/research",
  "$BackendDir/modules/education",
  "$BackendDir/modules/fleet",
  "$BackendDir/modules/iot",
  "$BackendDir/modules/telemetry",
  "$BackendDir/modules/hospital-map",
  "$BackendDir/modules/live-tracking",
  "$BackendDir/modules/simulation",
  "$BackendDir/modules/governance",
  "$BackendDir/modules/platform-governance",
  "$BackendDir/modules/llm-security",
  "$BackendDir/modules/interoperability",
  "$BackendDir/modules/regulatory",
  "$BackendDir/modules/equity",
  "$BackendDir/modules/human-review",
  "$BackendDir/modules/privacy-center",
  "$BackendDir/modules/ehr-audit",
  "$FrontendDir/pages/fleet",
  "$FrontendDir/pages/icu",
  "$FrontendDir/pages/lab",
  "$FrontendDir/pages/research",
  "$FrontendDir/pages/education",
  "$FrontendDir/pages/iot",
  "$FrontendDir/components/command-center",
  "$FrontendDir/components/governance"
)

Write-Host 'Mode: VERIFY ONLY'
Write-Host 'This script never deletes files. Use the generated audit output for manual review.'
Write-Host ''

foreach ($Dir in $DirsToDelete) {
  if (Test-Path $Dir) {
    Write-Host "Review candidate: $Dir"
  }
}

Write-Host ''
Write-Host 'Checking for remaining non-emergency references...'

foreach ($Pattern in $PatternsToRemove) {
  Write-Host ''
  Write-Host "Searching for '$Pattern'..."
  if (Get-Command rg -ErrorAction SilentlyContinue) {
    & rg -n --glob '*.{ts,tsx,js,jsx,json,css,md}' $Pattern $BackendDir $FrontendDir 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host '  None found' }
  } else {
    Get-ChildItem $BackendDir, $FrontendDir -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.css,*.md |
      Select-String -Pattern $Pattern
  }
}

Write-Host ''
Write-Host '=== Cleanup audit complete ==='
Write-Host 'No files were deleted. Archive or remove files only after proving they are inactive and unimported.'
Write-Host 'Next: Run route audit to verify active Emergency OS endpoints remain canonical.'
