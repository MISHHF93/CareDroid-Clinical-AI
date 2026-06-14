$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$failures = 0

function Test-RequiredFile {
  param(
    [string]$Label,
    [string]$Path
  )

  if (Test-Path $Path -PathType Leaf) {
    Write-Output "PASS $Label`: $Path"
  } else {
    Write-Output "FAIL $Label missing: $Path"
    $script:failures += 1
  }
}

function Test-FileContains {
  param(
    [string]$Label,
    [string]$Path,
    [string]$Pattern
  )

  if ((Test-Path $Path -PathType Leaf) -and (Select-String -Path $Path -Pattern $Pattern -Quiet)) {
    Write-Output "PASS $Label"
  } else {
    Write-Output "FAIL $Label"
    $script:failures += 1
  }
}

Test-RequiredFile 'frontend entrypoint' 'src/main.jsx'
Test-RequiredFile 'frontend app router' 'src/App.jsx'
Test-RequiredFile 'active AppShell' 'src/components/AppShell.tsx'
Test-RequiredFile 'active Sidebar' 'src/components/Sidebar.tsx'
Test-RequiredFile 'active Header' 'src/components/Header.tsx'
Test-RequiredFile 'active Emergency store' 'src/store/emergencyStore.ts'
Test-RequiredFile 'Emergency OS API facade' 'src/services/emergencyOsApi.js'
Test-RequiredFile 'Nest app module' 'backend/src/app.module.ts'
Test-RequiredFile 'Nest bootstrap' 'backend/src/main.ts'
Test-RequiredFile 'Emergency OS backend controller' 'backend/src/modules/emergency-os/emergency-os.controller.ts'

Test-FileContains 'App imports active AppShell' 'src/App.jsx' "from './components/AppShell'"
Test-FileContains 'App mounts one RootLayout shell' 'src/App.jsx' '<AppShell>'
Test-FileContains 'Nest global API prefix' 'backend/src/main.ts' "setGlobalPrefix\('api'"
Test-FileContains 'Emergency controller owns /api/emergency' 'backend/src/modules/emergency-os/emergency-os.controller.ts' "@Controller\('emergency'\)"
Test-FileContains 'API facade prefers /api/emergency' 'src/services/emergencyOsApi.js' '/api/emergency/'

$scanRoots = @('src', 'backend/src', 'lib') | Where-Object { Test-Path $_ -PathType Container }
$activeImportScan = foreach ($scanRoot in $scanRoots) {
  Get-ChildItem -Path $scanRoot -Recurse -File -Include *.js,*.jsx,*.ts,*.tsx |
    Select-String -Pattern "from ['\""].*frontend/src|frontend/src/main|frontend/src/App"
}
if ($activeImportScan) {
  Write-Output 'FAIL active code imports frontend/src as a second app'
  $failures += 1
} else {
  Write-Output 'PASS no active imports from frontend/src second app'
}

if (Test-Path 'frontend/package.json' -PathType Leaf) {
  Write-Output 'FAIL frontend/package.json exists, investigate possible second app'
  $failures += 1
} else {
  Write-Output 'PASS no frontend/package.json second app'
}

if ($failures -gt 0) {
  Write-Output "verify-single-instance failed with $failures issue(s)."
  exit 1
}

Write-Output 'verify-single-instance passed.'
