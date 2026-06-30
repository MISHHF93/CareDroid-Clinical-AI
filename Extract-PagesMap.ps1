# ============================================================
# CAREDROID -- PROJECT PAGES MAP EXTRACTOR
# Run from repo root: .\Extract-PagesMap.ps1
# Output: pages-map.txt  (UTF-8, no BOM)
# ============================================================

$Root       = (Get-Location).Path
$OutputFile = Join-Path $Root "pages-map.txt"

$ExcludeDirs = @(
    "node_modules", ".git", "dist", "build", ".next", ".nuxt",
    "coverage", "bin", "obj", ".turbo", ".cache", ".vercel",
    ".vscode", "archive", "test-results"
)

# -- helpers ------------------------------------------------------------------

function Is-Excluded($Path) {
    foreach ($d in $ExcludeDirs) {
        if ($Path -match ("(^|\\)" + [regex]::Escape($d) + "(\\|$)")) { return $true }
    }
    return $false
}

function Rel($Path) { $Path.Replace($Root + "\", "") }

$Out = [System.Collections.Generic.List[string]]::new()

function o($s)    { $Out.Add($s) }
function blank()  { $Out.Add("") }

function section($num, $title) {
    $Out.Add("")
    $Out.Add(("=" * 70))
    $Out.Add("  [$num]  $title")
    $Out.Add(("=" * 70))
}

function sub-heading($title) {
    $Out.Add("")
    $Out.Add("  -- $title")
}

function emit($rel)  { $Out.Add("  $rel") }
function emit2($rel) { $Out.Add("    $rel") }

function KnownItem($rel) {
    $fp = Join-Path $Root $rel
    if (Test-Path $fp) { emit (Rel $fp) }
}

# -- HEADER ------------------------------------------------------------------

o ("=" * 70)
o "  CAREDROID CLINICAL AI -- PROJECT MAP"
o "  Generated : $(Get-Date -Format 'yyyy-MM-dd  HH:mm')"
o "  Root      : $Root"
o ("=" * 70)

# ============================================================
#  [1]  ENTRY POINTS & APP BOOTSTRAP
# ============================================================
section 1 "ENTRY POINTS & APP BOOTSTRAP"
@(
    "index.html",
    "src\main.tsx",
    "src\app\App.tsx",
    "src\app\providers.tsx"
) | ForEach-Object { KnownItem $_ }

# ============================================================
#  [2]  ROUTING -- Router, Route Config, Redirects
# ============================================================
section 2 "ROUTING -- Router / Route Config / Redirects"

sub-heading "App Router"
@(
    "src\app\router.tsx",
    "src\app\screenModeRouteRedirects.tsx"
) | ForEach-Object { KnownItem $_ }

sub-heading "Route Config Files"
@(
    "src\config\routes.config.ts",
    "src\config\layout.config.ts",
    "src\config\platformEntryModel.ts"
) | ForEach-Object { KnownItem $_ }

sub-heading "src\routes\  (clinical tool routes)"
if (Test-Path "$Root\src\routes") {
    Get-ChildItem "$Root\src\routes" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\lib\ai\routes  +  lib\ AI routes"
@(
    "src\lib\ai\routes.ts",
    "lib\ai\routes.ts"
) | ForEach-Object { KnownItem $_ }

sub-heading "Backend: server-routes + API route modules"
KnownItem "backend\src\server-routes.ts"
if (Test-Path "$Root\backend\src\api") {
    Get-ChildItem "$Root\backend\src\api" -File |
        Where-Object { $_.Name -match '\.routes\.ts$' -and $_.Name -notmatch '\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

# ============================================================
#  [3]  ROUTE GUARDS & ACCESS CONTROL
# ============================================================
section 3 "ROUTE GUARDS & ACCESS CONTROL"
Get-ChildItem -Path "$Root\src" -Recurse -File |
    Where-Object {
        $_.Name -match 'Guard' -and
        $_.Name -notmatch '\.test\.|\.spec\.|\.css$' -and
        -not (Is-Excluded $_.FullName)
    } |
    Sort-Object FullName |
    ForEach-Object { emit (Rel $_.FullName) }

# ============================================================
#  [4]  LAYOUTS & APP SHELLS
# ============================================================
section 4 "LAYOUTS & APP SHELLS"

sub-heading "src\layouts\  (main shell)"
if (Test-Path "$Root\src\layouts") {
    Get-ChildItem "$Root\src\layouts" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\layout\  (breakpoints, tokens)"
if (Test-Path "$Root\src\layout") {
    Get-ChildItem "$Root\src\layout" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\components\layout\  (primitives: Box, Stack, Grid ...)"
if (Test-Path "$Root\src\components\layout") {
    Get-ChildItem "$Root\src\components\layout" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "Top-level shell components"
@(
    "src\components\AppShell.tsx",
    "src\components\Header.tsx",
    "src\components\Sidebar.tsx",
    "src\config\layout.config.ts"
) | ForEach-Object { KnownItem $_ }

# ============================================================
#  [5]  NAVIGATION CONFIG & MENUS
# ============================================================
section 5 "NAVIGATION CONFIG & MENUS"

sub-heading "Navigation Config Files  (src\config\)"
@(
    "src\config\navigation.config.ts",
    "src\config\unified-navigation.config.ts",
    "src\config\roleClusterNav.config.ts",
    "src\config\emergencyNavPolicy.ts",
    "src\config\emergencyRoleNavigationModel.ts",
    "src\config\trackMindRoleNavigationModel.ts"
) | ForEach-Object { KnownItem $_ }

sub-heading "Navigation Source  (src\navigation\)"
if (Test-Path "$Root\src\navigation") {
    Get-ChildItem "$Root\src\navigation" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\lib\navigation.ts"
@("src\lib\navigation.ts") | ForEach-Object { KnownItem $_ }

sub-heading "Sidebar & Header Components"
@(
    "src\components\Sidebar.tsx",
    "src\components\Header.tsx",
    "src\components\layout\RoleBasedNav.tsx",
    "src\components\CommandPalette.tsx"
) | ForEach-Object { KnownItem $_ }

# ============================================================
#  [6]  PAGES  (src\pages\ -- by domain)
# ============================================================
section 6 "PAGES -- src\pages\  (by domain)"

$pagesRoot = "$Root\src\pages"
if (Test-Path $pagesRoot) {
    # Root-level pages
    $rootPages = Get-ChildItem $pagesRoot -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' } |
        Sort-Object Name
    if ($rootPages) {
        sub-heading "Root-level pages"
        $rootPages | ForEach-Object { emit (Rel $_.FullName) }
    }

    # Domain subdirectories
    Get-ChildItem $pagesRoot -Directory | Sort-Object Name | ForEach-Object {
        $subDir = $_
        $files = Get-ChildItem $subDir.FullName -Recurse -File |
            Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' -and -not (Is-Excluded $_.FullName) } |
            Sort-Object FullName
        if ($files) {
            $testCnt = (Get-ChildItem $subDir.FullName -Recurse -File |
                Where-Object { $_.Name -match '\.test\.|\.spec\.' }).Count
            sub-heading "[$($subDir.Name)/]   ($($files.Count) src, $testCnt tests)"
            $files | ForEach-Object { emit2 (Rel $_.FullName) }
        }
    }
}

# ============================================================
#  [7]  WORKSPACES & CLINICAL SCREENS
# ============================================================
section 7 "WORKSPACES & CLINICAL SCREENS"
o "  (Screens, Dashboards, Command Centers, Whiteboards across src\)"
blank
Get-ChildItem -Path "$Root\src" -Recurse -File |
    Where-Object {
        ($_.Name -match 'Workspace|Dashboard|CommandCenter|CommandDesk|Whiteboard|Screen\.tsx') -and
        $_.Name -notmatch '\.test\.|\.spec\.|\.css$|\.d\.ts$' -and
        -not (Is-Excluded $_.FullName)
    } |
    Sort-Object FullName |
    ForEach-Object { emit (Rel $_.FullName) }

# ============================================================
#  [8]  FEATURE MODULES  (src\features\)
# ============================================================
section 8 "FEATURE MODULES -- src\features\"

$featRoot = "$Root\src\features"
if (Test-Path $featRoot) {
    $rootFeat = Get-ChildItem $featRoot -File | Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' }
    if ($rootFeat) { $rootFeat | Sort-Object Name | ForEach-Object { emit (Rel $_.FullName) } }

    Get-ChildItem $featRoot -Directory | Sort-Object Name | ForEach-Object {
        $sd = $_
        $src   = Get-ChildItem $sd.FullName -Recurse -File |
            Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) }
        $tests = (Get-ChildItem $sd.FullName -Recurse -File |
            Where-Object { $_.Name -match '\.test\.|\.spec\.' }).Count
        sub-heading "[$($sd.Name)/]  ($($src.Count) src, $tests tests)"
        $src | Sort-Object FullName | ForEach-Object { emit2 (Rel $_.FullName) }
    }
}

# ============================================================
#  [9]  COMPONENTS  (src\components\ -- directory overview)
# ============================================================
section 9 "COMPONENTS -- src\components\  (directory overview)"
o "  Each sub-folder listed with source count and test count."
blank

$compRoot = "$Root\src\components"
if (Test-Path $compRoot) {
    $rootComps = Get-ChildItem $compRoot -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$|\.d\.ts$' } |
        Sort-Object Name
    if ($rootComps) {
        sub-heading "Root-level components"
        $rootComps | ForEach-Object { emit (Rel $_.FullName) }
    }

    Get-ChildItem $compRoot -Directory | Sort-Object Name | ForEach-Object {
        $sd = $_
        $src = Get-ChildItem $sd.FullName -Recurse -File |
            Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$|\.d\.ts$' -and -not (Is-Excluded $_.FullName) }
        $tests = (Get-ChildItem $sd.FullName -Recurse -File |
            Where-Object { $_.Name -match '\.test\.|\.spec\.' }).Count

        sub-heading "[$($sd.Name)/]   ($($src.Count) src, $tests tests)"
        $src | Sort-Object FullName | ForEach-Object { emit2 (Rel $_.FullName) }
    }
}

# ============================================================
#  [10] CLINICAL TOOLS & CALCULATORS
# ============================================================
section 10 "CLINICAL TOOLS & CALCULATORS"

sub-heading "src\clinical-calculators\"
if (Test-Path "$Root\src\clinical-calculators") {
    Get-ChildItem "$Root\src\clinical-calculators" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\pages\tools\  (tool page components)"
if (Test-Path "$Root\src\pages\tools") {
    Get-ChildItem "$Root\src\pages\tools" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\utils\  (calculator / score utilities)"
if (Test-Path "$Root\src\utils") {
    Get-ChildItem "$Root\src\utils" -File |
        Where-Object { $_.Name -match 'Calculator|Score|Scale|Criteria' -and $_.Name -notmatch '\.test\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

# ============================================================
#  [11] CONFIG & DOMAIN MODELS  (src\config\)
# ============================================================
section 11 "CONFIG & DOMAIN MODELS -- src\config\"

sub-heading "Route & Navigation"
@(
    "src\config\routes.config.ts",
    "src\config\layout.config.ts",
    "src\config\navigation.config.ts",
    "src\config\unified-navigation.config.ts",
    "src\config\roleClusterNav.config.ts",
    "src\config\platformEntryModel.ts"
) | ForEach-Object { KnownItem $_ }

sub-heading "App & Feature Config  (*.config.ts)"
Get-ChildItem "$Root\src\config" -File |
    Where-Object {
        $_.Name -match '\.config\.ts$' -and
        $_.Name -notmatch '\.test\.' -and
        $_.Name -notmatch '^(routes|layout|navigation|unified-navigation|roleClusterNav)\.'
    } |
    Sort-Object Name |
    ForEach-Object { emit (Rel $_.FullName) }

sub-heading "Domain Models  (*Model.ts)"
Get-ChildItem "$Root\src\config" -File |
    Where-Object { $_.Name -match 'Model\.ts$' -and $_.Name -notmatch '\.test\.' } |
    Sort-Object Name |
    ForEach-Object { emit (Rel $_.FullName) }

sub-heading "Registries, Policies & Matrices"
Get-ChildItem "$Root\src\config" -File |
    Where-Object {
        $_.Name -match 'Registry|Policy|Matrix|Catalog|Taxonomy|Standards|Inventory|Entitlement' -and
        $_.Name -notmatch '\.test\.'
    } |
    Sort-Object Name |
    ForEach-Object { emit (Rel $_.FullName) }

# ============================================================
#  [12] SERVICES & API CLIENTS
# ============================================================
section 12 "SERVICES & API CLIENTS"

sub-heading "src\services\"
if (Test-Path "$Root\src\services") {
    Get-ChildItem "$Root\src\services" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\lib\  (apiClient, navigation, ai)"
if (Test-Path "$Root\src\lib") {
    Get-ChildItem "$Root\src\lib" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "lib\  (root-level orchestration libraries)"
if (Test-Path "$Root\lib") {
    Get-ChildItem "$Root\lib" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

# ============================================================
#  [13] AUTH, RBAC & USER PROFILES
# ============================================================
section 13 "AUTH, RBAC & USER PROFILES"

sub-heading "src\auth\  (auth session)"
if (Test-Path "$Root\src\auth") {
    Get-ChildItem "$Root\src\auth" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\lib\auth\  (lib auth utilities)"
if (Test-Path "$Root\src\lib\auth") {
    Get-ChildItem "$Root\src\lib\auth" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\lib\users\  (user profiles & roles)"
if (Test-Path "$Root\src\lib\users") {
    Get-ChildItem "$Root\src\lib\users" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "src\components\auth\  (RouteGuard, DemoSwitcher ...)"
if (Test-Path "$Root\src\components\auth") {
    Get-ChildItem "$Root\src\components\auth" -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "Auth & Role Config  (src\config\)"
@(
    "src\config\auth.config.ts",
    "src\config\entitlements.config.ts",
    "src\config\featureFlags.config.ts",
    "src\config\emergencyRolePermissions.ts",
    "src\config\emergencyPermissionRegistry.ts",
    "src\config\emergencyRoleActionMatrix.ts",
    "src\config\trackMindPermissionRegistry.ts",
    "src\config\trackMindRolePermissions.ts",
    "src\config\trackMindRoleCatalog.ts",
    "src\config\userProfileCatalog.ts",
    "src\config\userProfileCompiler.ts",
    "src\config\userProfileSegregation.ts"
) | ForEach-Object { KnownItem $_ }

# ============================================================
#  [14] AI / COPILOT
# ============================================================
section 14 "AI / COPILOT"

sub-heading "src\components\ai\  +  src\components\copilot\"
foreach ($d in @("$Root\src\components\ai","$Root\src\components\copilot","$Root\src\components\native-ai")) {
    if (Test-Path $d) {
        Get-ChildItem $d -Recurse -File |
            Where-Object { $_.Name -notmatch '\.test\.|\.spec\.|\.css$' -and -not (Is-Excluded $_.FullName) } |
            Sort-Object FullName |
            ForEach-Object { emit (Rel $_.FullName) }
    }
}

sub-heading "src\lib\ai\  (src-level AI lib)"
if (Test-Path "$Root\src\lib\ai") {
    Get-ChildItem "$Root\src\lib\ai" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "lib\ai\  (root AI orchestration)"
if (Test-Path "$Root\lib\ai") {
    Get-ChildItem "$Root\lib\ai" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "lib\native-ai\  (on-device AI)"
if (Test-Path "$Root\lib\native-ai") {
    Get-ChildItem "$Root\lib\native-ai" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "lib\patient-orchestration\"
if (Test-Path "$Root\lib\patient-orchestration") {
    Get-ChildItem "$Root\lib\patient-orchestration" -Recurse -File |
        Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "AI Config  (src\config\)"
@(
    "src\config\ai.config.ts",
    "src\config\copilotPlatform.config.ts",
    "src\config\copilotSafety.config.ts",
    "src\config\nativeAiThresholds.config.ts",
    "src\config\commandPalette.config.ts"
) | ForEach-Object { KnownItem $_ }

# ============================================================
#  [15] BACKEND API ROUTES & MODULES
# ============================================================
section 15 "BACKEND API ROUTES & MODULES"

sub-heading "backend\src\api\  (route modules)"
if (Test-Path "$Root\backend\src\api") {
    Get-ChildItem "$Root\backend\src\api" -File |
        Where-Object { $_.Name -notmatch '\.spec\.' } |
        Sort-Object Name |
        ForEach-Object { emit (Rel $_.FullName) }
}

sub-heading "backend\src\modules\  (NestJS service modules -- directory counts)"
if (Test-Path "$Root\backend\src\modules") {
    Get-ChildItem "$Root\backend\src\modules" -Directory | Sort-Object Name | ForEach-Object {
        $sd      = $_
        $srcCnt  = (Get-ChildItem $sd.FullName -Recurse -File | Where-Object { $_.Name -notmatch '\.spec\.' -and -not (Is-Excluded $_.FullName) }).Count
        $specCnt = (Get-ChildItem $sd.FullName -Recurse -File | Where-Object { $_.Name -match '\.spec\.' }).Count
        emit "  $($sd.Name)/   ($srcCnt src, $specCnt specs)"
    }
}

# ============================================================
#  [16] TEST FILES -- counts by area
# ============================================================
section 16 "TEST FILES -- counts by area"
o "  Format:  area path  ->  N test files"
blank

$testAreas = [ordered]@{
    "src\components"   = "$Root\src\components"
    "src\pages"        = "$Root\src\pages"
    "src\config"       = "$Root\src\config"
    "src\services"     = "$Root\src\services"
    "src\utils"        = "$Root\src\utils"
    "src\data"         = "$Root\src\data"
    "src\routes"       = "$Root\src\routes"
    "src\routing"      = "$Root\src\routing"
    "src\lib"          = "$Root\src\lib"
    "lib"              = "$Root\lib"
    "backend\src"      = "$Root\backend\src"
    "e2e"              = "$Root\e2e"
}
foreach ($kv in $testAreas.GetEnumerator()) {
    if (Test-Path $kv.Value) {
        $cnt   = (Get-ChildItem $kv.Value -Recurse -File |
            Where-Object { $_.Name -match '\.test\.|\.spec\.' -and -not (Is-Excluded $_.FullName) }).Count
        $label = $kv.Key.PadRight(22)
        emit "$label ->  $cnt test files"
    }
}

# ============================================================
#  [17] DOCUMENTATION
# ============================================================
section 17 "DOCUMENTATION"
Get-ChildItem $Root -Recurse -File |
    Where-Object {
        $_.Extension -in @(".md", ".mdx") -and
        -not (Is-Excluded $_.FullName)
    } |
    Sort-Object FullName |
    ForEach-Object { emit (Rel $_.FullName) }

# ============================================================
#  [18] SCRIPTS
# ============================================================
section 18 "SCRIPTS"
if (Test-Path "$Root\scripts") {
    Get-ChildItem "$Root\scripts" -Recurse -File |
        Where-Object { -not (Is-Excluded $_.FullName) } |
        Sort-Object FullName |
        ForEach-Object { emit (Rel $_.FullName) }
}

# ============================================================
#  SUMMARY
# ============================================================
section "--" "SUMMARY"

$allSrc  = Get-ChildItem $Root -Recurse -File | Where-Object { -not (Is-Excluded $_.FullName) }
$tsFiles = $allSrc | Where-Object { $_.Extension -in @(".ts",".tsx",".js",".jsx") }
$tests   = $allSrc | Where-Object { $_.Name -match '\.test\.|\.spec\.' }
$pages   = Get-ChildItem "$Root\src\pages" -Recurse -File -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' }
$comps   = Get-ChildItem "$Root\src\components" -Recurse -File -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -notmatch '\.test\.|\.spec\.' }
$cfgFiles= Get-ChildItem "$Root\src\config" -File | Where-Object { $_.Name -notmatch '\.test\.' }

blank
o "  Total files (excl. node_modules etc.)  :  $($allSrc.Count)"
o "  TypeScript / JavaScript source files   :  $($tsFiles.Count)"
o "  Test / spec files                      :  $($tests.Count)"
o "  Pages  (src\pages\, non-test)          :  $($pages.Count)"
o "  Components  (src\components\, non-test):  $($comps.Count)"
o "  Config files  (src\config\)            :  $($cfgFiles.Count)"
blank
o "  Sections  :  18"
o "  Generated :  $(Get-Date -Format 'yyyy-MM-dd  HH:mm:ss')"
o ("=" * 70)

# ============================================================
#  WRITE OUTPUT  (UTF-8, no BOM)
# ============================================================
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($OutputFile, $Out.ToArray(), $utf8NoBom)

Write-Host ""
Write-Host "Map written to : $OutputFile"
Write-Host "Lines          : $($Out.Count)"
