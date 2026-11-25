# Temporal Concepts in Folkloop

A quick, beginner-friendly guide mapping all **12 core Temporal.io concepts** directly to the real files and functions in Folkloop.

1. **Workflows** — `villagerLifecycleWorkflow` in `src/temporal/workflow.ts` (Workflow ID `villager-bob`, defined as `BOB_WORKFLOW_ID` in `src/lib/constants.ts`).
   Holds Bob's durable in-memory state (`hunger`, `energy`, `happiness`, `currentActivity`, `currentLocation`, `generation`, `eventSeq`) and runs his repeating **15-stop daily routine** across 6 village landmarks (`HOME`, `GARDEN`, `VILLAGE`, `BAKERY`, `POND`, `BENCH` in `src/lib/schedule.ts`). If `villager-bob` hasn't been started yet — or was terminated in the Temporal UI — `ensureBobWorkflowStarted` in `src/lib/temporal-client.ts` automatically starts a fresh run on the next API request.

2. **Activities** — `createVillagerActivities` in `src/temporal/activities.ts` (`persistVillagerState`, `recordVillagerEvent`, `sendVillagerNotification`).
   Regular async Node.js functions that perform PostgreSQL I/O outside the deterministic Workflow sandbox. Every write uses idempotent `ON CONFLICT` clauses (and monotonic `last_event_seq` checks for snapshots) so Temporal retries never create duplicate rows.

3. **Workers** — `src/temporal/worker.ts`.
   A standalone, always-on Node.js process (`pnpm run dev:worker`, or launched automatically by `pnpm dev`) that connects to Temporal Server and PostgreSQL and polls the Task Queue to run both Workflows and Activities.

4. **Task Queues** — `VILLAGER_TASK_QUEUE = 'folkloop-villagers'` in `src/lib/constants.ts`.
   The named queue linking Next.js API routes (`src/lib/temporal-client.ts`) to the Worker (`src/temporal/worker.ts`), decoupling the web frontend from background execution.

5. **Durable Timers** — `await sleep(delayMs)` in `src/temporal/workflow.ts`, paired with deterministic clock math in `src/lib/clock.ts` (`getInGameTime`, `getTimestampForInGameTime`) and half-hour-aware schedule helpers in `src/lib/schedule.ts` (`BOB_DAILY_SCHEDULE`, `scheduleSlotKey`, `getNextScheduleSlot`).
   At the default speed of **30 real seconds = 1 in-game hour** (`SIMULATION_MS_PER_HOUR=30000` in `.env.example`), timers live on Temporal Server rather than in Node.js memory — so if the Worker stops and restarts later, Bob catches up every missed stop in exact chronological order.

6. **Signals** — `wakeVillagerSignal` and `breadStolenSignal` in `src/temporal/signals.ts`, sent via `wakeBobWorkflow` and `stealBreadWorkflow` in `src/lib/temporal-client.ts` (`POST /api/villagers/bob/wake` and `POST /api/villagers/bob/steal-bread`).
   Fire-and-forget events that mutate workflow state asynchronously and are safely recorded in Workflow History even if the Worker is temporarily offline.

7. **Queries** — `getVillagerStateQuery` in `src/temporal/signals.ts`, called by `queryBobState` in `src/lib/temporal-client.ts` (`GET /api/villagers/bob/state`).
   Read-only snapshots of Bob's live in-memory workflow state. If the Worker is offline and the query times out (`WorkerUnavailableError`), `src/app/api/villagers/bob/state/route.ts` automatically falls back to PostgreSQL (`getVillagerSnapshot`) and returns `workerOnline: false`.

8. **Updates** — `feedVillagerUpdate` in `src/temporal/signals.ts`, called by `feedBobWorkflow` in `src/lib/temporal-client.ts` (`POST /api/villagers/bob/feed`).
   A synchronous, validated request-response interaction. Its `validator` in `src/temporal/workflow.ts` rejects invalid feeds immediately with `ApplicationFailure.nonRetryable` if Bob is sleeping (`VILLAGER_SLEEPING`), already full (`hunger <= 5`, `VILLAGER_ALREADY_FULL`), or given an out-of-range amount (`INVALID_FEED_AMOUNT`); otherwise it persists the change and returns Bob's updated state.

9. **Activity Retries** — Configured on `proxyActivities<VillagerActivities>` in `src/temporal/workflow.ts` (`startToCloseTimeout: '15 seconds'`, exponential backoff from `1 second` to `30 seconds`, `backoffCoefficient: 2`, `maximumAttempts: 5`).
   Transient database failures retry automatically without cluttering workflow logic, verified in `test/workflow.test.ts` and `test/activities.test.ts`.

10. **Deterministic Replay** — Temporal recovers workflow state after a Worker restart by replaying Event History through `villagerLifecycleWorkflow`.
    Because workflow code runs inside Temporal's deterministic sandbox (using deterministic `Date.now()` and `sleep()`), replay produces the exact same decisions every time — verified via `Worker.runReplayHistory` in `test/workflow.test.ts`.

11. **Continue-As-New** — Handled inside `villagerLifecycleWorkflow` in `src/temporal/workflow.ts`.
    Every `CONTINUE_AS_NEW_AFTER_DAYS` in-game days (default `3`, or earlier if `workflowInfo().continueAsNewSuggested` is true), the workflow waits for in-flight handlers with `await condition(allHandlersFinished)`, logs a `CONTINUED_AS_NEW` event, and calls `continueAsNew`. This keeps Event History bounded by rotating the `Run ID` and incrementing `generation` while preserving `Workflow ID` (`villager-bob`) and all state via `carriedState`.

12. **Workflow Execution History & Inspector** — `inspectBobWorkflow` in `src/lib/temporal-client.ts` powers `GET /api/villagers/bob/inspector` and renders inside the **`Temporal` tab** of `src/app/page.tsx`.
    Shows `villager-bob`'s live status, generation, next pending timer, history count, recent event tape, and a direct deep link to the execution history in the Temporal Web UI (`http://localhost:8233`).
