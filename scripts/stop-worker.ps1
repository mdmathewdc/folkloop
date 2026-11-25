# Stops only the Folkloop Temporal Worker process (for the Worker Crash Demonstration)

$workers = Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -match "node") -and ($_.CommandLine -match "src[\\/]temporal[\\/]worker")
}

if (-not $workers) {
  Write-Host "No running Folkloop Worker process found." -ForegroundColor Yellow
  exit 0
}

foreach ($proc in $workers) {
  Write-Host "Stopping Folkloop Worker (PID $($proc.ProcessId))..." -ForegroundColor Red
  Stop-Process -Id $proc.ProcessId -Force
}

Write-Host "Folkloop Worker stopped! Temporal Server, PostgreSQL, and Next.js remain running." -ForegroundColor Green
Write-Host "Wait ~30-60 seconds for in-game time to progress, then run: .\scripts\start-worker.ps1" -ForegroundColor Cyan
