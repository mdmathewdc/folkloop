#!/usr/bin/env bash
# Stops only the Folkloop Temporal Worker process (for WSL2 / Linux / macOS)
set -euo pipefail

PIDS=$(pgrep -f "src/temporal/worker" || true)
if [ -z "$PIDS" ]; then
  echo "No running Folkloop Worker process found."
  exit 0
fi

echo "Stopping Folkloop Worker PIDs: $PIDS"
kill -TERM $PIDS || true
echo "Folkloop Worker stopped! Temporal Server, PostgreSQL, and Next.js remain running."
echo "Wait ~30-60 seconds for in-game time to progress, then run: ./scripts/start-worker.sh"
