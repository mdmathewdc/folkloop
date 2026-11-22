import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { WorkflowUpdateFailedError } from '@temporalio/client';
import type {
  PersistVillagerStateInput,
  RecordVillagerEventInput,
  SendVillagerNotificationInput,
  VillagerActivities,
} from '../src/temporal/activities';
import {
  breadStolenSignal,
  feedVillagerUpdate,
  getVillagerStateQuery,
  wakeVillagerSignal,
} from '../src/temporal/signals';
import { villagerLifecycleWorkflow } from '../src/temporal/workflow';

const workflowsPath = path.resolve(__dirname, '../src/temporal/workflow.ts');

function createMockActivities(options?: { failFirstRecordEvent?: boolean }) {
  const events: RecordVillagerEventInput[] = [];
  const seenEventIds = new Set<string>();
  const snapshots: PersistVillagerStateInput['state'][] = [];
  const notifications: SendVillagerNotificationInput[] = [];
  let recordAttempts = 0;

  const activities: VillagerActivities = {
    async persistVillagerState(input) {
      snapshots.push(input.state);
    },
    async recordVillagerEvent(input) {
      recordAttempts += 1;
      if (options?.failFirstRecordEvent && recordAttempts === 1) {
        throw new Error('Simulated transient database error');
      }
      if (seenEventIds.has(input.id)) return { inserted: false };
      seenEventIds.add(input.id);
      events.push(input);
      return { inserted: true };
    },
    async sendVillagerNotification(input) {
      notifications.push(input);
      return { inserted: true };
    },
  };

  return { activities, events, snapshots, notifications, getRecordAttempts: () => recordAttempts };
}

describe('villagerLifecycleWorkflow (Temporal Time-Skipping Integration)', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  }, 30_000);

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('progresses through Bob daily routine using durable timers and read-only queries', async () => {
    const mock = createMockActivities();
    const taskQueue = 'test-routine-queue';
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: mock.activities,
    });

    await worker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start(villagerLifecycleWorkflow, {
        taskQueue,
        workflowId: 'villager-bob-routine-test',
        args: [
          {
            id: 'bob',
            name: 'Bob',
            occupation: 'Baker',
            initialInGameHour: 6.5,
            msPerInGameHour: 60_000,
            continueAsNewAfterDays: 5,
          },
        ],
      });

      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('SLEEPING');

      await testEnv.sleep('35 seconds');
      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('WAKING_UP');

      await testEnv.sleep('60 seconds');
      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('WALKING');

      await testEnv.sleep('60 seconds');
      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('BAKING');

      await testEnv.sleep('180 seconds');
      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('EATING');

      await testEnv.sleep('600 seconds');
      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('SLEEPING');

      expect(mock.events.map((e) => e.eventType)).toEqual([
        'WOKE_UP',
        'WALKED_TO_BAKERY',
        'STARTED_BAKING',
        'ATE_LUNCH',
        'RESUMED_BAKING',
        'CLOSED_BAKERY',
        'WALKED_HOME',
        'RELAXED',
        'WENT_TO_SLEEP',
      ]);

      await handle.terminate('test complete');
    });
  }, 30_000);

  it('handles Feed Update, Wake Up Signal, and Bread Stolen Signal', async () => {
    const mock = createMockActivities();
    const taskQueue = 'test-interactions-queue';
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: mock.activities,
    });

    await worker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start(villagerLifecycleWorkflow, {
        taskQueue,
        workflowId: 'villager-bob-interactions-test',
        args: [
          {
            id: 'bob',
            name: 'Bob',
            occupation: 'Baker',
            initialInGameHour: 6.0,
            msPerInGameHour: 60_000,
            continueAsNewAfterDays: 5,
          },
        ],
      });

      await expect(
        handle.executeUpdate(feedVillagerUpdate, { args: [{ amount: 25 }] }),
      ).rejects.toBeInstanceOf(WorkflowUpdateFailedError);

      await handle.signal(wakeVillagerSignal, { reason: 'morning test' });
      await testEnv.sleep('1 second');
      expect((await handle.query(getVillagerStateQuery)).currentActivity).toBe('WAKING_UP');

      // Redundant wake ignored gracefully
      await handle.signal(wakeVillagerSignal, { reason: 'redundant' });
      await testEnv.sleep('1 second');
      expect(mock.events.filter((e) => e.eventType === 'WOKEN_BY_PLAYER')).toHaveLength(1);

      const beforeFeed = await handle.query(getVillagerStateQuery);
      const feedResult = await handle.executeUpdate(feedVillagerUpdate, {
        args: [{ amount: 30, foodItem: 'sourdough toast' }],
      });
      expect(feedResult.accepted).toBe(true);
      expect(feedResult.state.hunger).toBe(Math.max(0, beforeFeed.hunger - 30));

      await expect(
        handle.executeUpdate(feedVillagerUpdate, { args: [{ amount: 20 }] }),
      ).rejects.toBeInstanceOf(WorkflowUpdateFailedError);

      const beforeTheft = await handle.query(getVillagerStateQuery);
      await handle.signal(breadStolenSignal, { thief: 'Sneaky Fox', loaves: 2 });
      await testEnv.sleep('1 second');

      expect((await handle.query(getVillagerStateQuery)).happiness).toBe(
        Math.max(0, beforeTheft.happiness - 25),
      );
      expect(mock.notifications).toHaveLength(1);

      await handle.terminate('test complete');
    });
  }, 30_000);

  it('retries failed activities automatically with exponential backoff', async () => {
    const mock = createMockActivities({ failFirstRecordEvent: true });
    const taskQueue = 'test-retry-queue';
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: mock.activities,
    });

    await worker.runUntil(async () => {
      const handle = await testEnv.client.workflow.start(villagerLifecycleWorkflow, {
        taskQueue,
        workflowId: 'villager-bob-retry-test',
        args: [
          {
            id: 'bob',
            name: 'Bob',
            occupation: 'Baker',
            initialInGameHour: 6.9,
            msPerInGameHour: 60_000,
            continueAsNewAfterDays: 5,
          },
        ],
      });

      await testEnv.sleep('15 seconds');
      expect(mock.getRecordAttempts()).toBeGreaterThanOrEqual(2);
      expect(mock.events.filter((e) => e.eventType === 'WOKE_UP')).toHaveLength(1);

      await handle.terminate('test complete');
    });
  }, 30_000);

  it('executes Continue-As-New after configured days, preserving state and advancing generation', async () => {
    const mock = createMockActivities();
    const taskQueue = 'test-can-queue';
    const worker = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: mock.activities,
    });

    await worker.runUntil(async () => {
      const workflowId = 'villager-bob-can-test';
      const handle = await testEnv.client.workflow.start(villagerLifecycleWorkflow, {
        taskQueue,
        workflowId,
        args: [
          {
            id: 'bob',
            name: 'Bob',
            occupation: 'Baker',
            initialInGameHour: 6.9,
            msPerInGameHour: 60_000,
            continueAsNewAfterDays: 1,
          },
        ],
      });

      const firstRunId = handle.firstExecutionRunId;
      await testEnv.sleep('25 minutes');

      const latestHandle = testEnv.client.workflow.getHandle(workflowId);
      const desc = await latestHandle.describe();
      const state = await latestHandle.query(getVillagerStateQuery);

      expect(desc.runId).not.toBe(firstRunId);
      expect(state.generation).toBeGreaterThanOrEqual(2);
      expect(mock.events.some((e) => e.eventType === 'CONTINUED_AS_NEW')).toBe(true);

      await latestHandle.terminate('test complete');
    });
  }, 30_000);

  it('survives Worker shutdown, replays deterministically, and catches up without duplicates', async () => {
    const mock = createMockActivities();
    const taskQueue = 'test-crash-recovery-queue';
    const workflowId = 'villager-bob-crash-recovery-test';

    const worker1 = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: mock.activities,
      maxCachedWorkflows: 0,
    });

    await worker1.runUntil(async () => {
      await testEnv.client.workflow.start(villagerLifecycleWorkflow, {
        taskQueue,
        workflowId,
        args: [
          {
            id: 'bob',
            name: 'Bob',
            occupation: 'Baker',
            initialInGameHour: 6.9,
            msPerInGameHour: 60_000,
            continueAsNewAfterDays: 5,
          },
        ],
      });

      await testEnv.sleep('10 seconds');
      expect(
        (await testEnv.client.workflow.getHandle(workflowId).query(getVillagerStateQuery))
          .currentActivity,
      ).toBe('WAKING_UP');
    });

    const worker2 = await Worker.create({
      connection: testEnv.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: mock.activities,
      stickyQueueScheduleToStartTimeout: '1s',
    });

    let capturedHistory: Awaited<
      ReturnType<ReturnType<typeof testEnv.client.workflow.getHandle>['fetchHistory']>
    > | null = null;

    await worker2.runUntil(async () => {
      await testEnv.sleep('150 seconds');
      const handle = testEnv.client.workflow.getHandle(workflowId);
      const recoveredState = await handle.query(getVillagerStateQuery);

      expect(recoveredState.currentActivity).toBe('BAKING');
      expect(mock.events.filter((e) => e.eventType === 'WOKE_UP')).toHaveLength(1);
      expect(mock.events.filter((e) => e.eventType === 'STARTED_BAKING')).toHaveLength(1);

      capturedHistory = await handle.fetchHistory();
      await handle.terminate('test complete');
    });

    expect(capturedHistory).not.toBeNull();
    await Worker.runReplayHistory({ workflowsPath }, capturedHistory!);
  }, 45_000);
});
