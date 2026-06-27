$ErrorActionPreference = "Stop"

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

if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILDING CAREDROID ANDROID APK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Push-Location ..
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npx --yes @capacitor/cli@5 sync android
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}

& ".\gradlew.bat" assembleDebug
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apk = Get-Item $apkPath
    Write-Host ""
    Write-Host "Build successful." -ForegroundColor Green
    Write-Host "APK Location: $($apk.FullName)" -ForegroundColor Cyan
    Write-Host "APK Size: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor White
} else {
    Write-Host "Build finished, but APK was not found at $apkPath." -ForegroundColor Yellow
}
