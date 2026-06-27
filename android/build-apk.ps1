$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "CareDroid Android APK Builder" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$javaHomes = @(
    "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot",
    "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
)

foreach ($javaHome in $javaHomes) {
    if (Test-Path "$javaHome\bin\java.exe") {
        $env:JAVA_HOME = $javaHome
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
        break
    }
}

$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk"
)

foreach ($sdkPath in $sdkPaths) {
    if (-not $env:ANDROID_HOME -and (Test-Path $sdkPath)) {
        $env:ANDROID_HOME = $sdkPath
        $env:ANDROID_SDK_ROOT = $sdkPath
        break
    }
}

if (-not $env:ANDROID_HOME) {
    Write-Host "Android SDK not found. Install Android Studio or set ANDROID_HOME." -ForegroundColor Red
    exit 1
}

Push-Location "$PSScriptRoot\.."
try {
    Write-Host ""
    Write-Host "Building TypeScript web app..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host ""
    Write-Host "Syncing Capacitor Android shell..." -ForegroundColor Cyan
    npx --yes @capacitor/cli@5 sync android
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Building Android APK..." -ForegroundColor Cyan
& "$PSScriptRoot\gradlew.bat" assembleDebug
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$apkPath = "$PSScriptRoot\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "Build successful." -ForegroundColor Green
    Write-Host "APK Location: $apkPath" -ForegroundColor Cyan
    Write-Host "APK Size: $apkSize MB" -ForegroundColor White
}
