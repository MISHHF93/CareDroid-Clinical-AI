$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

$logPath = Join-Path $PSScriptRoot "careddroid-start-log.txt"
Start-Transcript -Path $logPath -Force | Out-Null

Write-Host "Starting CareDroid..."
Write-Host ""
Write-Host 'Once you see "[web] API ready - starting Vite dev server."'
Write-Host "open this in your browser:"
Write-Host ""
Write-Host "    http://localhost:3000"
Write-Host ""
Write-Host "Keep this window OPEN while you use the app."
Write-Host "Close this window to stop the app."
Write-Host ""
Write-Host "(Everything below is also being saved to careddroid-start-log.txt)"
Write-Host ""

npm run dev:fullstack

Stop-Transcript | Out-Null
Read-Host "Press Enter to close this window"
