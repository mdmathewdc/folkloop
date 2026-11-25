# Folkloop

A Pokémon Emerald–style pixel-art life simulation powered by **[Temporal.io](https://temporal.io/)**, **Next.js (App Router)**, **Phaser 3**, and **PostgreSQL**.

Watch **Bob the Baker** follow a persistent **15-stop daily routine** across 6 Hoenn-inspired village landmarks (`HOME`, `GARDEN`, `VILLAGE`, `BAKERY`, `POND`, `BENCH`) at **30 real seconds = 1 in-game hour** — even when your browser is closed or the Temporal Worker crashes and restarts.

## Quick Start

Requires **Node.js >= 20**, **pnpm >= 9**, and **Docker Desktop** running.

```bash
pnpm install
pnpm dev
```

`pnpm dev` creates `.env` from `.env.example` (if missing), starts PostgreSQL and Temporal via Docker Compose, runs SQL migrations, and launches Next.js + the Temporal Worker together.

- **Folkloop Village:** [http://localhost:3000](http://localhost:3000)
- **Temporal Web UI:** [http://localhost:8233](http://localhost:8233)

## How It Works

- **1 Durable Workflow (`villager-bob`):** `villagerLifecycleWorkflow` (`src/temporal/workflow.ts`) owns Bob's live needs (`Hunger`, `Energy`, `Happiness`), walks him through his 15 half-hour-aware stops (`src/lib/schedule.ts`), and compacts history via Continue-As-New every 3 in-game days.
- **3 Idempotent Activities (`src/temporal/activities.ts`):** `persistVillagerState`, `recordVillagerEvent`, and `sendVillagerNotification` write snapshots, story events, and alerts to PostgreSQL with `ON CONFLICT` guards so retries never create duplicates.
- **Update vs. Signal vs. Query (`src/temporal/signals.ts`):**
  - **Update (`Feed`):** Synchronously validated (`feedVillagerUpdate`) — rejects if Bob is sleeping or already full (`hunger <= 5`).
  - **Signals (`Wake`, `Steal Bread`):** Fire-and-forget events (`wakeVillagerSignal`, `breadStolenSignal`) buffered durably by Temporal.
  - **Query (`getVillagerStateQuery`):** Live state reads for the UI, with automatic PostgreSQL snapshot fallback when the Worker is offline.
- **`Story` & `Temporal` Tabs (`src/app/page.tsx`):** Switch between Bob's chronological village log (**Story**) and live workflow telemetry, next durable timer, event history tape, and Temporal Web UI link (**Temporal**).

New to Temporal? Read **[docs/TEMPORAL_CONCEPTS.md](docs/TEMPORAL_CONCEPTS.md)** for a beginner-friendly map of all 12 Temporal concepts to Folkloop's code.

## Worker Crash Demo

1. Start the app with `pnpm dev` and watch Bob progress through his routine.
2. In a second terminal, stop **only** the Worker: `./scripts/stop-worker.sh` (WSL2/macOS/Linux) or `.\scripts\stop-worker.ps1` (Windows PowerShell).
3. The village UI stays online, switches to **`WORKER OFFLINE`**, and shows the latest PostgreSQL snapshot while Temporal Server keeps Bob's durable timers ticking.
4. Restart the Worker with `pnpm run dev:worker` — Temporal replays history, catches up missed stops in chronological order, and writes zero duplicate events.

## Hosting Note (Vercel)

- **Vercel** is ideal for the Next.js frontend and `/api/villagers/bob/*` routes (which only act as a lightweight Temporal Client and PostgreSQL reader).
- Temporal requires a **persistent Temporal Server** and a **long-running, always-on Worker** (`src/temporal/worker.ts`) — serverless functions cannot hold a Worker polling loop.
- A simple production stack: **Vercel** (Next.js app) + **Temporal Cloud** (or self-hosted Temporal) + **Neon / Supabase** (PostgreSQL) + **Railway / Fly.io** (always-on Worker).
- Point Vercel and the Worker at the same `DATABASE_URL`, `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, and `TEMPORAL_TASK_QUEUE`.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Docker (Postgres + Temporal), run migrations, and launch Web + Worker |
| `pnpm test` | Run Vitest unit, activity, and Temporal time-skipping/replay tests |
| `pnpm run typecheck` | Run strict TypeScript type-checking (`tsc --noEmit`) |
| `pnpm run build` | Build the Next.js production bundle |
| `pnpm run infra:down` | Stop the local Docker Compose services |
