# Folkloop — Little lives. Endless stories.

**Folkloop V1** is a persistent, browser-based pixel-art life simulation powered by **[Temporal.io](https://temporal.io/)**, **Next.js (App Router)**, **Phaser 3**, and **PostgreSQL**.

Meet **Bob the Baker**. Bob lives in a cosy pixel-art village — waking up, walking to his bakery, baking bread, eating lunch, closing up, walking home, relaxing, and sleeping — **even when the browser is closed or the Worker crashes and restarts.**

---

## Project Structure

A single, flat TypeScript app (no monorepo build steps, no separate API server):

```text
folkloop/
├── src/
│   ├── app/
│   │   ├── api/villagers/bob/   # Next.js Route Handlers (Temporal Client + Postgres reads)
│   │   └── page.tsx             # Main Folkloop village UI
│   ├── components/              # CharacterPanel, ActivityFeed, TemporalInspector, VillageCanvas
│   ├── game/                    # Phaser 3 pixel-art village scene
│   ├── lib/                     # Clock, schedule, needs, DB pool, Temporal client
│   └── temporal/                # signals.ts, activities.ts, workflow.ts, worker.ts
├── test/                        # Vitest + Temporal time-skipping & replay tests
├── infrastructure/
│   ├── docker-compose.yml       # PostgreSQL 16 + Temporal Dev Server & Web UI (:8233)
│   └── migrations/              # SQL schema migrations
├── scripts/
│   ├── dev.mjs                  # One-command `pnpm dev` runner
│   ├── migrate.mjs              # SQL migration runner
│   └── stop-worker.{sh,ps1}     # Worker Crash Demonstration scripts
└── docs/
    └── TEMPORAL_CONCEPTS.md     # Guide mapping all 12 Temporal concepts to Folkloop code
```

---

## Quick Start (One Command!)

Prerequisites: **Node.js >= 20**, **pnpm >= 9**, and **Docker Desktop** running.

```bash
pnpm install
pnpm dev
```

`pnpm dev` automatically:
1. Creates `.env` from `.env.example` (if missing)
2. Starts PostgreSQL (`:5432`) and Temporal Server + Web UI (`:7233` / `:8233`) via Docker Compose
3. Waits for both services and runs SQL migrations
4. Launches **Next.js (`:3000`)** and the **Temporal Worker** together in one terminal with color-coded `[web]` and `[worker]` logs

Open:
- **Folkloop Village:** [http://localhost:3000](http://localhost:3000)
- **Temporal Web UI:** [http://localhost:8233](http://localhost:8233)

---

## Worker Crash & Recovery Demonstration

1. Run `pnpm dev` and watch Bob progress through his routine.
2. In a second terminal, stop **only** the Worker:
   - WSL2 / Bash: `./scripts/stop-worker.sh`
   - Windows PowerShell: `.\scripts\stop-worker.ps1`
3. Notice the browser stays online and switches to **`WORKER OFFLINE`**, displaying the last persisted PostgreSQL snapshot while Temporal Server keeps Bob's durable timers ticking.
4. Wait 1–2 minutes, then restart the Worker:
   ```bash
   pnpm run dev:worker
   ```
5. Watch Temporal replay Bob's Workflow History, catch up missed hours chronologically, and persist zero duplicate events.

---

## Useful Commands

```bash
pnpm dev              # Start everything (Docker + migrations + Web + Worker)
pnpm test             # Run all Vitest & Temporal time-skipping/replay tests
pnpm run typecheck    # Strict TypeScript check
pnpm run build        # Next.js production build
pnpm run dev:worker   # Start only the Temporal Worker
pnpm run dev:web      # Start only Next.js
pnpm run infra:down   # Stop Docker containers
```

Read **[docs/TEMPORAL_CONCEPTS.md](docs/TEMPORAL_CONCEPTS.md)** for a beginner-friendly walkthrough of every Temporal concept used in Folkloop.
