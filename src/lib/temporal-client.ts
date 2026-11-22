import {
  Client,
  Connection,
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
  WorkflowUpdateFailedError,
} from '@temporalio/client';
import { ApplicationFailure } from '@temporalio/common';
import { getConfig } from './config';
import { BOB_VILLAGER_ID, BOB_WORKFLOW_ID } from './constants';
import type {
  BreadStolenSignalPayload,
  FeedVillagerRequest,
  FeedVillagerResult,
  PendingTimerInfo,
  VillagerActivity,
  VillagerState,
  WakeVillagerSignalPayload,
  WorkflowHistorySummaryEvent,
  WorkflowInspectorInfo,
} from './types';

export class FeedValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FeedValidationError';
  }
}

export class WorkerUnavailableError extends Error {
  constructor(message = 'Temporal Worker is currently offline or did not respond in time.') {
    super(message);
    this.name = 'WorkerUnavailableError';
  }
}

const globalForTemporal = globalThis as unknown as {
  __folkloopTemporalClientPromise?: Promise<Client>;
};

async function getTemporalClient(): Promise<Client> {
  if (!globalForTemporal.__folkloopTemporalClientPromise) {
    const config = getConfig();
    globalForTemporal.__folkloopTemporalClientPromise = Connection.connect({
      address: config.temporalAddress,
    })
      .then((connection) => new Client({ connection, namespace: config.temporalNamespace }))
      .catch((err) => {
        globalForTemporal.__folkloopTemporalClientPromise = undefined;
        throw err;
      });
  }
  return globalForTemporal.__folkloopTemporalClientPromise;
}

function protobufTimestampToIso(
  ts?: { seconds?: number | { toNumber(): number } | null; nanos?: number | null } | null,
): string | null {
  if (!ts || ts.seconds === undefined || ts.seconds === null) return null;
  const secs = typeof ts.seconds === 'number' ? ts.seconds : ts.seconds.toNumber();
  const nanos = ts.nanos ?? 0;
  return new Date(secs * 1000 + Math.floor(nanos / 1_000_000)).toISOString();
}

function protobufDurationToSeconds(
  dur?: { seconds?: number | { toNumber(): number } | null; nanos?: number | null } | null,
): number | null {
  if (!dur || dur.seconds === undefined || dur.seconds === null) return null;
  const secs = typeof dur.seconds === 'number' ? dur.seconds : dur.seconds.toNumber();
  const nanos = dur.nanos ?? 0;
  return secs + nanos / 1_000_000_000;
}

function formatHistoryEventType(rawType: unknown): string {
  if (typeof rawType === 'string') {
    return rawType.replace(/^EVENT_TYPE_/, '');
  }
  return String(rawType ?? 'UNKNOWN');
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new WorkerUnavailableError()), timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function ensureBobWorkflowStarted(): Promise<{
  workflowId: string;
  runId: string;
  started: boolean;
}> {
  const client = await getTemporalClient();
  const config = getConfig();
  try {
    const handle = await client.workflow.start('villagerLifecycleWorkflow', {
      taskQueue: config.temporalTaskQueue,
      workflowId: BOB_WORKFLOW_ID,
      args: [
        {
          id: BOB_VILLAGER_ID,
          name: 'Bob',
          occupation: 'Baker',
          initialInGameHour: 6.75,
          msPerInGameHour: config.simulationMsPerHour,
          continueAsNewAfterDays: config.continueAsNewAfterDays,
        },
      ],
    });
    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
      started: true,
    };
  } catch (err) {
    if (err instanceof WorkflowExecutionAlreadyStartedError) {
      const handle = client.workflow.getHandle(BOB_WORKFLOW_ID);
      const desc = await handle.describe();
      return {
        workflowId: desc.workflowId,
        runId: desc.runId,
        started: false,
      };
    }
    throw err;
  }
}

export async function queryBobState(timeoutMs = 2500): Promise<VillagerState> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(BOB_WORKFLOW_ID);
  try {
    return await withTimeout(handle.query<VillagerState>('getVillagerState'), timeoutMs);
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      await ensureBobWorkflowStarted();
      return await withTimeout(handle.query<VillagerState>('getVillagerState'), timeoutMs);
    }
    throw err;
  }
}

export async function feedBobWorkflow(req?: FeedVillagerRequest): Promise<FeedVillagerResult> {
  await ensureBobWorkflowStarted();
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(BOB_WORKFLOW_ID);
  try {
    return await withTimeout(
      handle.executeUpdate<FeedVillagerResult, [FeedVillagerRequest | undefined]>('feedVillager', {
        args: [req],
      }),
      5000,
    );
  } catch (err) {
    if (err instanceof WorkflowUpdateFailedError) {
      const cause = err.cause;
      if (cause instanceof ApplicationFailure) {
        throw new FeedValidationError(cause.message, cause.type ?? 'FEED_VALIDATION_FAILED');
      }
      throw new FeedValidationError(err.message, 'FEED_VALIDATION_FAILED');
    }
    throw err;
  }
}

export async function wakeBobWorkflow(payload?: WakeVillagerSignalPayload): Promise<void> {
  await ensureBobWorkflowStarted();
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(BOB_WORKFLOW_ID);
  await handle.signal('wakeVillager', payload);
}

export async function stealBreadWorkflow(payload?: BreadStolenSignalPayload): Promise<void> {
  await ensureBobWorkflowStarted();
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(BOB_WORKFLOW_ID);
  await handle.signal('breadStolen', payload);
}

export async function inspectBobWorkflow(): Promise<WorkflowInspectorInfo> {
  const client = await getTemporalClient();
  const config = getConfig();
  const handle = client.workflow.getHandle(BOB_WORKFLOW_ID);

  let desc;
  try {
    desc = await handle.describe();
  } catch (err) {
    if (err instanceof WorkflowNotFoundError) {
      await ensureBobWorkflowStarted();
      desc = await handle.describe();
    } else {
      throw err;
    }
  }

  const history = await handle.fetchHistory();
  const rawEvents = history.events ?? [];

  const scheduledActivities = new Map<string, string>();
  let lastCompletedActivity: { activityType: string; completedAt: string | null } | null = null;
  const activeTimers = new Map<string, PendingTimerInfo>();
  const summaryEvents: WorkflowHistorySummaryEvent[] = [];

  for (const ev of rawEvents) {
    const eventId = ev.eventId ? String(ev.eventId) : '?';
    const eventType = formatHistoryEventType(ev.eventType);
    const eventTime = protobufTimestampToIso(ev.eventTime);
    let details = '';

    if (ev.activityTaskScheduledEventAttributes) {
      const actType = ev.activityTaskScheduledEventAttributes.activityType?.name ?? 'unknown';
      scheduledActivities.set(eventId, actType);
      details = `Activity: ${actType}`;
    } else if (ev.activityTaskCompletedEventAttributes) {
      const schedId = String(ev.activityTaskCompletedEventAttributes.scheduledEventId ?? '');
      const actType = scheduledActivities.get(schedId) ?? 'activity';
      lastCompletedActivity = { activityType: actType, completedAt: eventTime };
      details = `Completed: ${actType}`;
    } else if (ev.timerStartedEventAttributes) {
      const timerId = ev.timerStartedEventAttributes.timerId ?? eventId;
      const delaySecs = protobufDurationToSeconds(
        ev.timerStartedEventAttributes.startToFireTimeout,
      );
      const estimatedFireAt =
        eventTime && delaySecs !== null
          ? new Date(new Date(eventTime).getTime() + delaySecs * 1000).toISOString()
          : null;
      activeTimers.set(timerId, {
        timerId,
        startedAt: eventTime,
        fireDelaySeconds: delaySecs !== null ? Math.round(delaySecs) : null,
        estimatedFireAt,
      });
      details = `Timer #${timerId} (${delaySecs !== null ? `${Math.round(delaySecs)}s` : '?'})`;
    } else if (ev.timerFiredEventAttributes) {
      const timerId = ev.timerFiredEventAttributes.timerId ?? '';
      activeTimers.delete(timerId);
      details = `Timer #${timerId} fired`;
    } else if (ev.timerCanceledEventAttributes) {
      const timerId = ev.timerCanceledEventAttributes.timerId ?? '';
      activeTimers.delete(timerId);
      details = `Timer #${timerId} canceled`;
    } else if (ev.workflowExecutionSignaledEventAttributes) {
      details = `Signal: ${ev.workflowExecutionSignaledEventAttributes.signalName ?? 'unknown'}`;
    } else if (ev.workflowExecutionUpdateAcceptedEventAttributes) {
      const name =
        ev.workflowExecutionUpdateAcceptedEventAttributes.acceptedRequest?.input?.name ?? 'update';
      details = `Update accepted: ${name}`;
    } else if (ev.workflowExecutionUpdateCompletedEventAttributes) {
      details = 'Update completed';
    } else if (ev.workflowExecutionStartedEventAttributes) {
      details = `Started (${ev.workflowExecutionStartedEventAttributes.workflowType?.name ?? 'workflow'})`;
    } else if (ev.workflowExecutionContinuedAsNewEventAttributes) {
      details = 'Continued as new run';
    }

    summaryEvents.push({ eventId, eventType, eventTime, details });
  }

  let currentActivity: VillagerActivity | null = null;
  try {
    const liveState = await withTimeout(handle.query<VillagerState>('getVillagerState'), 1000);
    currentActivity = liveState.currentActivity;
  } catch {
    currentActivity = null;
  }

  const pendingTimer = activeTimers.size > 0 ? Array.from(activeTimers.values()).pop()! : null;
  const baseUi = config.temporalUiUrl.replace(/\/$/, '');
  const temporalUiUrl = `${baseUi}/namespaces/${encodeURIComponent(config.temporalNamespace)}/workflows/${encodeURIComponent(desc.workflowId)}/${encodeURIComponent(desc.runId)}/history`;

  return {
    workflowId: desc.workflowId,
    runId: desc.runId,
    status: desc.status.name,
    taskQueue: desc.taskQueue,
    workflowType: desc.type,
    startTime: desc.startTime ? desc.startTime.toISOString() : null,
    historyLength: desc.historyLength,
    currentActivity,
    lastCompletedActivity,
    pendingTimer,
    recentEvents: summaryEvents.slice(-15).reverse(),
    temporalUiUrl,
  };
}
