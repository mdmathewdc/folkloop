import { ApplicationFailure } from '@temporalio/common';
import {
  allHandlersFinished,
  condition,
  continueAsNew,
  log,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from '@temporalio/workflow';
import { createClockConfig, getInGameTime, getTimestampForInGameTime } from '../lib/clock';
import {
  BREAD_STOLEN_HAPPINESS_PENALTY,
  DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS,
  DEFAULT_MS_PER_IN_GAME_HOUR,
  FEED_DEFAULT_AMOUNT,
  FEED_HAPPINESS_BOOST,
  FEED_MIN_HUNGER_THRESHOLD,
  INITIAL_BOB_NEEDS,
  WAKE_EARLY_ENERGY_PENALTY,
} from '../lib/constants';
import { applyNeedsDelta } from '../lib/needs';
import { getInitialStateForHour, getNextScheduleSlot, scheduleSlotKey } from '../lib/schedule';
import type {
  BreadStolenSignalPayload,
  ClockConfig,
  FeedVillagerRequest,
  FeedVillagerResult,
  VillagerActivity,
  VillagerLocation,
  VillagerNeeds,
  VillagerState,
  VillagerWorkflowInput,
  WakeVillagerSignalPayload,
} from '../lib/types';
import type { VillagerActivities } from './activities';
import {
  breadStolenSignal,
  feedVillagerUpdate,
  getVillagerStateQuery,
  wakeVillagerSignal,
} from './signals';

export { breadStolenSignal, feedVillagerUpdate, getVillagerStateQuery, wakeVillagerSignal };

const activities = proxyActivities<VillagerActivities>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '30 seconds',
    maximumAttempts: 5,
  },
});

export async function villagerLifecycleWorkflow(input: VillagerWorkflowInput): Promise<void> {
  const info = workflowInfo();
  const startNowMs = Date.now();

  const clockConfig: ClockConfig =
    input.clockConfig ??
    createClockConfig(
      startNowMs,
      input.initialInGameHour ?? 6.75,
      input.msPerInGameHour ?? DEFAULT_MS_PER_IN_GAME_HOUR,
    );

  const continueAsNewAfterDays = Math.max(
    1,
    input.continueAsNewAfterDays ?? DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS,
  );

  const initialInGameTime = getInGameTime(startNowMs, clockConfig);
  const startDay = initialInGameTime.day;

  let needs: VillagerNeeds;
  let currentActivity: VillagerActivity;
  let currentLocation: VillagerLocation;
  let lastProcessedScheduleKey: number;
  let eventSeq: number;
  let generation: number;
  let lastUpdatedAt = new Date(startNowMs).toISOString();

  if (input.carriedState) {
    needs = {
      hunger: input.carriedState.hunger,
      energy: input.carriedState.energy,
      happiness: input.carriedState.happiness,
    };
    currentActivity = input.carriedState.currentActivity;
    currentLocation = input.carriedState.currentLocation;
    lastProcessedScheduleKey = input.carriedState.lastProcessedScheduleKey;
    eventSeq = input.carriedState.eventSeq;
    generation = input.carriedState.generation + 1;
  } else {
    needs = { ...INITIAL_BOB_NEEDS };
    const initialSlot = getInitialStateForHour(initialInGameTime.hour, initialInGameTime.minute);
    currentActivity = initialSlot.activity;
    currentLocation = initialSlot.location;
    const isExactBoundary = initialInGameTime.minute === 0 || initialInGameTime.minute === 30;
    lastProcessedScheduleKey =
      scheduleSlotKey(initialInGameTime.day, initialInGameTime.hour, initialInGameTime.minute) -
      (isExactBoundary ? 1 : 0);
    eventSeq = 0;
    generation = 1;
  }

  function buildStateSnapshot(referenceMs: number = Date.now()): VillagerState {
    const t = getInGameTime(referenceMs, clockConfig);
    return {
      id: input.id,
      name: input.name,
      occupation: input.occupation,
      hunger: needs.hunger,
      energy: needs.energy,
      happiness: needs.happiness,
      currentActivity,
      currentLocation,
      currentDay: t.day,
      currentHour: t.hour,
      currentMinute: t.minute,
      lastUpdatedAt,
      simulationEpochMs: clockConfig.simulationEpochMs,
      msPerInGameHour: clockConfig.msPerInGameHour,
      generation,
      eventSeq,
    };
  }

  setHandler(getVillagerStateQuery, () => buildStateSnapshot(Date.now()));

  setHandler(
    feedVillagerUpdate,
    async (req?: FeedVillagerRequest): Promise<FeedVillagerResult> => {
      const amount = req?.amount ?? FEED_DEFAULT_AMOUNT;
      const foodItem = req?.foodItem?.trim() || 'a warm meal';

      needs = applyNeedsDelta(needs, {
        hunger: -amount,
        happiness: FEED_HAPPINESS_BOOST,
      });

      const nowMs = Date.now();
      const t = getInGameTime(nowMs, clockConfig);
      lastUpdatedAt = new Date(nowMs).toISOString();
      eventSeq += 1;
      const seq = eventSeq;
      const snapshot = buildStateSnapshot(nowMs);

      await activities.recordVillagerEvent({
        id: `${input.id}:feed:${seq}`,
        villagerId: input.id,
        eventType: 'FED_BY_PLAYER',
        description: `${input.name} enjoyed ${foodItem}. (Hunger -${amount}, Happiness +${FEED_HAPPINESS_BOOST})`,
        occurredAt: lastUpdatedAt,
        inGameDay: t.day,
        inGameHour: t.hour,
        inGameMinute: t.minute,
        workflowId: info.workflowId,
        runId: info.runId,
      });

      await activities.persistVillagerState({ state: snapshot });

      return {
        accepted: true,
        message: `${input.name} happily ate ${foodItem}!`,
        state: snapshot,
      };
    },
    {
      validator: (req?: FeedVillagerRequest) => {
        if (currentActivity === 'SLEEPING') {
          throw ApplicationFailure.nonRetryable(
            `${input.name} is sleeping right now. Wake him up before feeding him.`,
            'VILLAGER_SLEEPING',
          );
        }
        if (needs.hunger <= FEED_MIN_HUNGER_THRESHOLD) {
          throw ApplicationFailure.nonRetryable(
            `${input.name} is already full and doesn't need food right now.`,
            'VILLAGER_ALREADY_FULL',
          );
        }
        if (
          req?.amount !== undefined &&
          (!Number.isFinite(req.amount) || req.amount < 5 || req.amount > 100)
        ) {
          throw ApplicationFailure.nonRetryable(
            'Feed amount must be a number between 5 and 100.',
            'INVALID_FEED_AMOUNT',
          );
        }
      },
    },
  );

  setHandler(wakeVillagerSignal, async (payload?: WakeVillagerSignalPayload) => {
    if (currentActivity !== 'SLEEPING') {
      log.info('Wake signal ignored because villager is already awake', {
        villagerId: input.id,
        currentActivity,
      });
      return;
    }

    currentActivity = 'WAKING_UP';
    currentLocation = 'HOME';
    needs = applyNeedsDelta(needs, { energy: -WAKE_EARLY_ENERGY_PENALTY });

    const nowMs = Date.now();
    const t = getInGameTime(nowMs, clockConfig);
    lastUpdatedAt = new Date(nowMs).toISOString();
    eventSeq += 1;
    const seq = eventSeq;
    const snapshot = buildStateSnapshot(nowMs);

    const reasonText = payload?.reason ? ` (${payload.reason})` : '';
    await activities.recordVillagerEvent({
      id: `${input.id}:wake:${seq}`,
      villagerId: input.id,
      eventType: 'WOKEN_BY_PLAYER',
      description: `${input.name} was woken up early by the player${reasonText}.`,
      occurredAt: lastUpdatedAt,
      inGameDay: t.day,
      inGameHour: t.hour,
      inGameMinute: t.minute,
      workflowId: info.workflowId,
      runId: info.runId,
    });

    await activities.persistVillagerState({ state: snapshot });
  });

  setHandler(breadStolenSignal, async (payload?: BreadStolenSignalPayload) => {
    needs = applyNeedsDelta(needs, {
      happiness: -BREAD_STOLEN_HAPPINESS_PENALTY,
    });

    const nowMs = Date.now();
    const t = getInGameTime(nowMs, clockConfig);
    lastUpdatedAt = new Date(nowMs).toISOString();

    eventSeq += 1;
    const theftSeq = eventSeq;
    eventSeq += 1;
    const upsetSeq = eventSeq;
    const snapshot = buildStateSnapshot(nowMs);

    const thiefLabel = payload?.thief?.trim() || 'Someone';
    const loaves = payload?.loaves && payload.loaves > 1 ? `${payload.loaves} loaves of ` : '';

    await activities.recordVillagerEvent({
      id: `${input.id}:bread-stolen:${theftSeq}`,
      villagerId: input.id,
      eventType: 'BREAD_STOLEN',
      description: `${thiefLabel} stole ${loaves}${input.name}'s bread!`,
      occurredAt: lastUpdatedAt,
      inGameDay: t.day,
      inGameHour: t.hour,
      inGameMinute: t.minute,
      workflowId: info.workflowId,
      runId: info.runId,
    });

    await activities.recordVillagerEvent({
      id: `${input.id}:upset:${upsetSeq}`,
      villagerId: input.id,
      eventType: 'BREAD_STOLEN',
      description: `${input.name} became upset.`,
      occurredAt: lastUpdatedAt,
      inGameDay: t.day,
      inGameHour: t.hour,
      inGameMinute: t.minute,
      workflowId: info.workflowId,
      runId: info.runId,
    });

    await activities.sendVillagerNotification({
      id: `${input.id}:notif:bread-stolen:${theftSeq}`,
      villagerId: input.id,
      title: 'Bread Stolen!',
      message: `${thiefLabel} stole ${loaves}${input.name}'s bread! His happiness dropped to ${needs.happiness}.`,
      severity: 'warning',
    });

    await activities.persistVillagerState({ state: snapshot });
  });

  if (!input.carriedState) {
    await activities.persistVillagerState({ state: buildStateSnapshot(startNowMs) });
  }

  log.info('Villager lifecycle workflow running', {
    villagerId: input.id,
    generation,
    startDay,
    continueAsNewAfterDays,
    msPerInGameHour: clockConfig.msPerInGameHour,
  });

  while (true) {
    const currentInGameDay = getInGameTime(Date.now(), clockConfig).day;
    const daysElapsedInRun = currentInGameDay - startDay;

    if (daysElapsedInRun >= continueAsNewAfterDays || workflowInfo().continueAsNewSuggested) {
      log.info('Preparing Continue-As-New for villager workflow', {
        villagerId: input.id,
        generation,
        daysElapsedInRun,
        continueAsNewSuggested: workflowInfo().continueAsNewSuggested,
      });

      await condition(allHandlersFinished);

      const rolloverNowMs = Date.now();
      const rolloverTime = getInGameTime(rolloverNowMs, clockConfig);
      eventSeq += 1;

      await activities.recordVillagerEvent({
        id: `${input.id}:can:gen-${generation}:seq-${eventSeq}`,
        villagerId: input.id,
        eventType: 'CONTINUED_AS_NEW',
        description: `Workflow history compacted via Continue-As-New (Generation ${generation} -> ${generation + 1}).`,
        occurredAt: new Date(rolloverNowMs).toISOString(),
        inGameDay: rolloverTime.day,
        inGameHour: rolloverTime.hour,
        inGameMinute: rolloverTime.minute,
        workflowId: info.workflowId,
        runId: info.runId,
      });

      await continueAsNew<typeof villagerLifecycleWorkflow>({
        id: input.id,
        name: input.name,
        occupation: input.occupation,
        clockConfig,
        continueAsNewAfterDays,
        carriedState: {
          hunger: needs.hunger,
          energy: needs.energy,
          happiness: needs.happiness,
          currentActivity,
          currentLocation,
          lastProcessedScheduleKey,
          eventSeq,
          generation,
        },
      });
    }

    const next = getNextScheduleSlot(lastProcessedScheduleKey);
    const slotMinute = next.slot.minute ?? 0;
    const targetMs = getTimestampForInGameTime(next.day, next.slot.hour, clockConfig, slotMinute);
    const delayMs = targetMs - Date.now();

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const transitionNowMs = Date.now();
    needs = applyNeedsDelta(needs, next.slot.needsDelta);
    currentActivity = next.slot.activity;
    currentLocation = next.slot.location;
    lastProcessedScheduleKey = next.key;
    lastUpdatedAt = new Date(transitionNowMs).toISOString();
    eventSeq += 1;

    const snapshot = buildStateSnapshot(transitionNowMs);

    await activities.recordVillagerEvent({
      id: `${input.id}:d${next.day}:h${next.slot.hour}m${slotMinute}:${next.slot.eventType}`,
      villagerId: input.id,
      eventType: next.slot.eventType,
      description: next.slot.description,
      occurredAt: new Date(targetMs).toISOString(),
      inGameDay: next.day,
      inGameHour: next.slot.hour,
      inGameMinute: slotMinute,
      workflowId: info.workflowId,
      runId: info.runId,
    });

    await activities.persistVillagerState({ state: snapshot });
  }
}
