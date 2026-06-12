$ErrorActionPreference = 'Stop'

Write-Host '=== Cleaning Frontend - Emergency OS Audit ==='

$FrontendDir = './src'
$Execute = $env:CLEAN_EXECUTE -eq 'true'

$PagesToRemove = @(
  "$FrontendDir/pages/icu",
  "$FrontendDir/pages/lab",
  "$FrontendDir/pages/research",
  "$FrontendDir/pages/education",
  "$FrontendDir/pages/fleet",
  "$FrontendDir/pages/iot",
  "$FrontendDir/pages/command-center",
  "$FrontendDir/pages/dashboard-old",
  "$FrontendDir/pages/modules",
  "$FrontendDir/pages/platform",
  "$FrontendDir/pages/commercial",
  "$FrontendDir/pages/organization"
)

$ComponentsToRemove = @(
  "$FrontendDir/components/icu-dashboard",
  "$FrontendDir/components/lab-results",
  "$FrontendDir/components/research-panel",
  "$FrontendDir/components/governance",
  "$FrontendDir/components/module-navigation",
  "$FrontendDir/components/nested-sidebar",
  "$FrontendDir/components/duplicate-header"
)

$HooksToRemove = @(
  "$FrontendDir/hooks/useModuleRegistry",
  "$FrontendDir/hooks/useEnterpriseFeatures"
)

Write-Host ("Mode: " + ($(if ($Execute) { 'DELETE' } else { 'DRY RUN' })))
Write-Host ''

function Remove-OrReport($Target) {
  if (Test-Path $Target) {
    if ($Execute) {
      Write-Host "Removing: $Target"
      Remove-Item -Recurse -Force $Target
    } else {
      Write-Host "Would remove: $Target"
    }
  }
}

foreach ($Page in $PagesToRemove) {
  Remove-OrReport $Page
}

foreach ($Component in $ComponentsToRemove) {
  Remove-OrReport $Component
  Remove-OrReport "$Component.tsx"
  Remove-OrReport "$Component.jsx"
  Remove-OrReport "$Component.ts"
  Remove-OrReport "$Component.js"
}

foreach ($Hook in $HooksToRemove) {
  Remove-OrReport "$Hook.ts"
  Remove-OrReport "$Hook.js"
}

Write-Host ''
Write-Host '=== Required Emergency OS pages/components ==='
$Required = @(
  "$FrontendDir/components/EmergencyWhiteboard.jsx",
  "$FrontendDir/components/EMSPipeline.jsx",
  "$FrontendDir/components/QueueIntelligencePanel.jsx",
  "$FrontendDir/components/ReassessmentDrawer.jsx",
  "$FrontendDir/pages/emergency/SmartIntake.jsx",
  "$FrontendDir/pages/emergency/EmergencySettings.jsx"
)

foreach ($Item in $Required) {
  if (Test-Path $Item) {
    Write-Host "Present: $Item"
  } else {
    Write-Host "Missing: $Item"
  }
}

Write-Host ''
Write-Host '=== Remaining top-level pages ==='
if (Test-Path "$FrontendDir/pages") {
  Get-ChildItem "$FrontendDir/pages" -Recurse -File -Include *.jsx,*.tsx,*.js,*.ts |
    Sort-Object FullName |
    ForEach-Object { Write-Host $_.FullName }
} else {
  Write-Host 'No pages directory'
}

Write-Host ''
Write-Host '=== Frontend cleanup audit complete ==='
if (-not $Execute) {
  Write-Host 'No files were deleted. Re-run with CLEAN_EXECUTE=true after reviewing the dry run.'
}
