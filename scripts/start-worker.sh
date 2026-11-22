#!/usr/bin/env bash
# Starts (or restarts) the Folkloop Temporal Worker (for WSL2 / Linux / macOS)
set -euo pipefail

echo "Starting Folkloop Temporal Worker..."
echo "Watch the structured logs as Temporal replays Bob's workflow and catches up missed timers!"
pnpm run dev:worker
