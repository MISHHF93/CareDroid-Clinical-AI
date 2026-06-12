$ErrorActionPreference = 'Stop'

Write-Host '=== Emergency OS Verification ==='
Write-Host 'Checking for dead code and legacy references...'

$Failed = $false
$BackendDir = './backend/src'
$FrontendDir = './src'

Write-Host ''
Write-Host 'Checking for legacy module imports...'
$LegacyImports = @(
  'from.*icu',
  'from.*lab',
  'from.*research',
  'from.*education',
  'from.*fleet',
  'from.*iot',
  'from.*digital.*twin',
  'from.*governance',
  'from.*command.*center'
)

foreach ($Pattern in $LegacyImports) {
  if (Get-Command rg -ErrorAction SilentlyContinue) {
    $Results = & rg -n -i --glob '*.{ts,tsx,js,jsx}' $Pattern $BackendDir $FrontendDir 2>$null |
      Select-String -Pattern 'legacy|FUTURE_RELEASE_ROUTES' -NotMatch |
      Select-Object -First 5
  } else {
    $Results = Get-ChildItem $BackendDir, $FrontendDir -Recurse -Include *.ts,*.tsx,*.js,*.jsx |
      Select-String -Pattern $Pattern |
      Select-String -Pattern 'legacy' -NotMatch |
      Select-Object -First 5
  }

  if ($Results) {
    Write-Host "Found legacy import/reference: $Pattern"
    $Results | ForEach-Object { Write-Host $_ }
    $Failed = $true
  } else {
    Write-Host "No legacy imports for: $Pattern"
  }
}

Write-Host ''
Write-Host 'Checking required Emergency OS route files...'
$RequiredBackendRoutes = @(
  "$BackendDir/api/ems.routes.ts",
  "$BackendDir/api/reassessment.routes.ts",
  "$BackendDir/api/capacity.routes.ts",
  "$BackendDir/api/copilot.routes.ts",
  "$BackendDir/api/smart-intake.routes.ts"
)

foreach ($Route in $RequiredBackendRoutes) {
  if (Test-Path $Route) {
    Write-Host "Present: $Route"
  } else {
    Write-Host "Missing: $Route"
    $Failed = $true
  }
}

Write-Host ''
Write-Host 'Checking required Emergency OS frontend surfaces...'
$KnownEmergencyComponents = @(
  'EmergencyWhiteboard',
  'EMSPipeline',
  'QueueIntelligencePanel',
  'ReassessmentDrawer',
  'Capacity',
  'PatientCard',
  'ChatInterface',
  'SmartIntake',
  'EmergencySettings'
)

foreach ($Component in $KnownEmergencyComponents) {
  if (Get-Command rg -ErrorAction SilentlyContinue) {
    & rg -n $Component $FrontendDir --glob '*.{js,jsx,ts,tsx}' >$null 2>$null
    $Found = $LASTEXITCODE -eq 0
  } else {
    $Found = [bool](Get-ChildItem $FrontendDir -Recurse -Include *.js,*.jsx,*.ts,*.tsx | Select-String -Pattern $Component | Select-Object -First 1)
  }

  if ($Found) {
    Write-Host "Referenced: $Component"
  } else {
    Write-Host "Possibly unused or missing: $Component"
  }
}

Write-Host ''
Write-Host 'Checking .env for legacy variables...'
if (Test-Path '.env') {
  $LegacyEnv = Select-String -Path '.env' -Pattern '(ICU|LAB|RESEARCH|FLEET|IOT|DIGITAL_TWIN|GOVERNANCE)'
  if ($LegacyEnv) {
    Write-Host 'Legacy env vars found:'
    $LegacyEnv | ForEach-Object { Write-Host $_ }
  } else {
    Write-Host 'No legacy env vars'
  }
}

Write-Host ''
Write-Host '=== Verification Complete ==='
if ($Failed) {
  Write-Host 'Some checks failed. Review issues above before destructive cleanup.'
  exit 1
}

Write-Host 'All blocking checks passed for Emergency OS verification.'
