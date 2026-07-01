$ErrorActionPreference = "Continue"
$root = "C:\Users\borah\CareDroid-Clinical-AI"
$report = @()

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command,
        [string]$WorkingDirectory = $root
    )

    Write-Host "`n========== $Name ==========" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $Command 2>&1 | Tee-Object -Variable output
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 0 }
    } catch {
        $output = @($_.Exception.Message)
        $code = 1
    } finally {
        Pop-Location
    }

    $script:report += [pscustomobject]@{
        Name = $Name
        ExitCode = $code
        Output = ($output | Out-String).Trim()
    }

    Write-Host "EXIT CODE: $code" -ForegroundColor $(if ($code -eq 0) { 'Green' } else { 'Red' })
    return $code
}

Run-Step "npm run lint" { npm.cmd run lint }
Run-Step "npm run typecheck:frontend" { npm.cmd run typecheck:frontend }
Run-Step "npm run test:registry-launch" { npm.cmd run test:registry-launch }
Run-Step "npm run test:responsive-regression" { npm.cmd run test:responsive-regression }
Run-Step "npm run build" { npm.cmd run build }
Run-Step "backend npm run build" { npm.cmd run build } -WorkingDirectory (Join-Path $root "backend")
Run-Step "backend npm test" { npm.cmd test } -WorkingDirectory (Join-Path $root "backend")

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Yellow
$report | ForEach-Object {
    $status = if ($_.ExitCode -eq 0) { "PASS" } else { "FAIL" }
    Write-Host ("{0} | exit {1} | {2}" -f $status, $_.ExitCode, $_.Name)
}

$reportPath = Join-Path $root "validation-report.json"
$report | ConvertTo-Json -Depth 4 | Set-Content -Path $reportPath -Encoding UTF8
Write-Host "Report written to $reportPath"