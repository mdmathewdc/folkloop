export type VillagerActivity =
  | 'SLEEPING'
  | 'WAKING_UP'
  | 'GARDENING'
  | 'WALKING'
  | 'BAKING'
  | 'FETCHING_WATER'
  | 'EATING'
  | 'RESTOCKING'
  | 'STROLLING'
  | 'RELAXING'
  | 'IDLE';

export type VillagerLocation = 'HOME' | 'GARDEN' | 'VILLAGE' | 'BAKERY' | 'POND' | 'BENCH';

export interface VillagerNeeds {
  hunger: number;
  energy: number;
  happiness: number;
}

export interface ClockConfig {
  /** Real-world Unix ms timestamp corresponding to Day 1, 00:00 in-game */
  simulationEpochMs: number;
  /** Real-world milliseconds per 1 in-game hour (default: 30000) */
  msPerInGameHour: number;
}

export interface InGameTime {
  day: number;
  hour: number;
  minute: number;
  totalHours: number;
  formattedTime: string;
}

export interface VillagerState {
  id: string;
  name: string;
  occupation: string;
  hunger: number;
  energy: number;
  happiness: number;
  currentActivity: VillagerActivity;
  currentLocation: VillagerLocation;
  currentDay: number;
  currentHour: number;
  currentMinute: number;
  lastUpdatedAt: string;
  simulationEpochMs: number;
  msPerInGameHour: number;
  generation: number;
  eventSeq: number;
}

export type VillagerEventType =
  | 'WOKE_UP'
  | 'TENDED_GARDEN'
  | 'WALKED_TO_BAKERY'
  | 'STARTED_BAKING'
  | 'FETCHED_WATER'
  | 'ATE_LUNCH'
  | 'CHECKED_SIGNPOST'
  | 'RESUMED_BAKING'
  | 'RESTOCKED_FLOUR'
  | 'CLOSED_BAKERY'
  | 'STROLLED_BY_POND'
  | 'WALKED_HOME'
  | 'RELAXED'
  | 'WENT_TO_SLEEP'
  | 'FED_BY_PLAYER'
  | 'WOKEN_BY_PLAYER'
  | 'BREAD_STOLEN'
  | 'CONTINUED_AS_NEW';

export interface VillagerEventRecord {
  id: string;
  villagerId: string;
  eventType: VillagerEventType;
  description: string;
  occurredAt: string;
  inGameDay: number;
  inGameHour: number;
  inGameMinute: number;
  workflowId: string;
  runId: string | null;
  createdAt: string;
}

export interface VillagerNotificationRecord {
  id: string;
  villagerId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  createdAt: string;
}

export interface FeedVillagerRequest {
  amount?: number;
  foodItem?: string;
}

export interface FeedVillagerResult {
  accepted: boolean;
  message: string;
  state: VillagerState;
}

export interface BreadStolenSignalPayload {
  thief?: string;
  loaves?: number;
}

export interface WakeVillagerSignalPayload {
  reason?: string;
}

export interface VillagerWorkflowInput {
  id: string;
  name: string;
  occupation: string;
  initialInGameHour?: number;
  clockConfig?: ClockConfig;
  msPerInGameHour?: number;
  carriedState?: {
    hunger: number;
    energy: number;
    happiness: number;
    currentActivity: VillagerActivity;
    currentLocation: VillagerLocation;
    lastProcessedScheduleKey: number;
    eventSeq: number;
    generation: number;
  };
  continueAsNewAfterDays?: number;
}

export interface WorkflowHistorySummaryEvent {
  eventId: string;
  eventType: string;
  eventTime: string | null;
  details: string;
}

export interface PendingTimerInfo {
  timerId: string;
  startedAt: string | null;
  fireDelaySeconds: number | null;
  estimatedFireAt: string | null;
}

export interface WorkflowInspectorInfo {
  workflowId: string;
  runId: string;
  status: string;
  taskQueue: string;
  workflowType: string;
  startTime: string | null;
  historyLength: number;
  currentActivity: VillagerActivity | null;
  lastCompletedActivity: {
    activityType: string;
    completedAt: string | null;
  } | null;
  pendingTimer: PendingTimerInfo | null;
  recentEvents: WorkflowHistorySummaryEvent[];
  temporalUiUrl: string;
}
