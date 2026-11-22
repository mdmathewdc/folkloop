# Starts (or restarts) the Folkloop Temporal Worker to demonstrate durable replay & recovery.

Write-Host "Starting Folkloop Temporal Worker..." -ForegroundColor Cyan
Write-Host "Watch the structured logs as Temporal replays Bob's workflow and catches up missed timers!" -ForegroundColor Green
pnpm run dev:worker
