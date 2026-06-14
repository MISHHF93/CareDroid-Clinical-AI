#!/usr/bin/env bash
set -euo pipefail

PORTS="${PORTS:-3000 3001 8000 8080 1883 5432 27017}"

echo "=== CareDroid Port Check ==="
echo "Ports: $PORTS"
echo "This script reports only; it does not kill processes."

if command -v powershell.exe >/dev/null 2>&1; then
  for port in $PORTS; do
    powershell.exe -NoProfile -Command "\$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if (\$connections) { Write-Output \"IN_USE $port\"; \$connections | Select-Object -First 5 LocalAddress,LocalPort,State,OwningProcess | Format-Table -AutoSize } else { Write-Output \"FREE $port\" }"
  done
  exit 0
fi

if command -v netstat >/dev/null 2>&1; then
  for port in $PORTS; do
    if netstat -ano 2>/dev/null | rg -q ":${port}\\s"; then
      echo "IN_USE $port"
      netstat -ano 2>/dev/null | rg ":${port}\\s" || true
    else
      echo "FREE $port"
    fi
  done
  exit 0
fi

echo "No supported port checker found. Suggested Windows command:"
echo "Get-NetTCPConnection -LocalPort 3000,8000,8001,5173 -ErrorAction SilentlyContinue"
