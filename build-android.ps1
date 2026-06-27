$ErrorActionPreference = "Stop"

Write-Host "Building CareDroid Android APK..." -ForegroundColor Cyan

$javaHomes = @(
    "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot",
    "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
)

foreach ($javaHome in $javaHomes) {
    if (Test-Path "$javaHome\bin\java.exe") {
        $env:JAVA_HOME = $javaHome
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
        Write-Host "Java Home: $env:JAVA_HOME" -ForegroundColor Green
        break
    }
}

if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    Write-Host "Android SDK: $env:ANDROID_HOME" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Building TypeScript web app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 2: Syncing Capacitor Android shell..." -ForegroundColor Cyan
npx --yes @capacitor/cli@5 sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Step 3: Building Android APK..." -ForegroundColor Cyan
Push-Location android
try {
    .\gradlew.bat assembleDebug
    $buildResult = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($buildResult -ne 0) { exit $buildResult }

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "APK Location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
