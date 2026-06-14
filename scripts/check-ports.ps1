param(
  [int[]]$Ports = @(3000, 3001, 8000, 8080, 1883, 5432, 27017)
)

$ErrorActionPreference = 'Stop'

Write-Output '=== CareDroid Port Check ==='
Write-Output "Ports: $($Ports -join ' ')"
Write-Output 'This script reports only; it does not kill processes.'

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    $processNames = foreach ($processId in $pids) {
      try {
        (Get-Process -Id $processId -ErrorAction Stop).ProcessName
      } catch {
        'unknown'
      }
    }
    Write-Output "IN_USE $port pids=$($pids -join ',') processes=$($processNames -join ',')"
  } else {
    Write-Output "FREE $port"
  }
}
