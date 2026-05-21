$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  BUILDING CAREDROID ANDROID APK" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

& ".\gradlew.bat" assembleDebug

if (Test-Path "app\build\outputs\apk\debug\app-debug.apk") {
    Write-Host "`n✅ ✅ ✅ BUILD SUCCESSFUL! ✅ ✅ ✅`n" -ForegroundColor Green
    $apk = Get-Item "app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "APK Location: $($apk.FullName)" -ForegroundColor Cyan
    Write-Host "APK Size: $([math]::Round($apk.Length/1MB, 2)) MB`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Build failed or APK not found`n" -ForegroundColor Red
}
