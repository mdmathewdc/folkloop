# Temporal Concepts in Folkloop

This guide maps every core **Temporal.io** concept directly to the actual files and functions in **Folkloop V1**.

1. **Workflows** — `villagerLifecycleWorkflow` in `src/temporal/workflow.ts` (Workflow ID `villager-bob`). Holds Bob's durable in-memory state (`hunger`, `energy`, `happiness`, `currentActivity`, `currentLocation`) and orchestrates his repeating daily routine.
2. **Activities** — `createVillagerActivities` in `src/temporal/activities.ts` (`persistVillagerState`, `recordVillagerEvent`, `sendVillagerNotification`). Plain async Node.js functions that perform PostgreSQL I/O with idempotent `ON CONFLICT` guards.
3. **Workers** — `src/temporal/worker.ts`. Standalone Node.js process that polls the `folkloop-villagers` Task Queue to execute both Workflows and Activities.
4. **Task Queues** — `VILLAGER_TASK_QUEUE = 'folkloop-villagers'` in `src/lib/constants.ts`. Routes tasks between Next.js API routes (`src/lib/temporal-client.ts`) and the Worker (`src/temporal/worker.ts`).
5. **Durable Timers** — `await sleep(delayMs)` in `src/temporal/workflow.ts` paired with deterministic clock math in `src/lib/clock.ts`. Missed schedule boundaries after Worker downtime are caught up in exact chronological order.
6. **Signals** — `wakeVillagerSignal` and `breadStolenSignal` in `src/temporal/signals.ts`, dispatched by `POST /api/villagers/bob/wake` and `POST /api/villagers/bob/steal-bread`.
7. **Queries** — `getVillagerStateQuery` in `src/temporal/signals.ts`, queried by `GET /api/villagers/bob/state` with automatic PostgreSQL snapshot fallback when the Worker is offline.
8. **Updates** — `feedVillagerUpdate` in `src/temporal/signals.ts` with a synchronous `validator` in `src/temporal/workflow.ts` that rejects feeding if Bob is sleeping or already full (`hunger <= 5`).
9. **Activity Retries** — Configured via `proxyActivities` in `src/temporal/workflow.ts` (exponential backoff, up to 5 attempts) and verified in `test/workflow.test.ts` + `test/activities.test.ts`.
10. **Deterministic Replay** — Verified via `Worker.runReplayHistory` in `test/workflow.test.ts`.
11. **Continue-As-New** — Drains all handlers with `await condition(allHandlersFinished)` then calls `continueAsNew` after `CONTINUE_AS_NEW_AFTER_DAYS` (default `3`), rotating `Run ID` while preserving `Workflow ID` (`villager-bob`) and all villager state.
12. **Workflow Execution History & Inspector** — `inspectBobWorkflow` in `src/lib/temporal-client.ts` powers `GET /api/villagers/bob/inspector` and `src/components/TemporalInspector.tsx` with a direct link to the Temporal Web UI (`http://localhost:8233`).
