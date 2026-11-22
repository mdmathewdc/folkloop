import { Context } from '@temporalio/activity';
import type { Pool } from 'pg';
import type { VillagerEventType, VillagerState } from '../lib/types';

export interface PersistVillagerStateInput {
  state: VillagerState;
}

export interface RecordVillagerEventInput {
  id: string;
  villagerId: string;
  eventType: VillagerEventType;
  description: string;
  occurredAt: string;
  inGameDay: number;
  inGameHour: number;
  inGameMinute: number;
  workflowId: string;
  runId: string;
}

export interface SendVillagerNotificationInput {
  id: string;
  villagerId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
}

export interface VillagerActivities {
  persistVillagerState(input: PersistVillagerStateInput): Promise<void>;
  recordVillagerEvent(input: RecordVillagerEventInput): Promise<{ inserted: boolean }>;
  sendVillagerNotification(input: SendVillagerNotificationInput): Promise<{ inserted: boolean }>;
}

export interface ActivityLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const defaultLogger: ActivityLogger = {
  info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
  warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta })),
  error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
};

function getActivityMeta(): Record<string, unknown> {
  try {
    const info = Context.current().info;
    return {
      activityId: info.activityId,
      activityType: info.activityType,
      attempt: info.attempt,
      workflowId: info.workflowExecution?.workflowId,
      runId: info.workflowExecution?.runId,
    };
  } catch {
    return { attempt: 1 };
  }
}

export function createVillagerActivities(
  pool: Pool,
  logger: ActivityLogger = defaultLogger,
): VillagerActivities {
  return {
    async persistVillagerState(input: PersistVillagerStateInput): Promise<void> {
      const { state } = input;
      const meta = getActivityMeta();

      logger.info('Persisting villager state snapshot', {
        ...meta,
        villagerId: state.id,
        activity: state.currentActivity,
        location: state.currentLocation,
        day: state.currentDay,
        hour: state.currentHour,
        eventSeq: state.eventSeq,
      });

      await pool.query(
        `INSERT INTO villagers (id, name, occupation)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [state.id, state.name, state.occupation],
      );

      await pool.query(
        `INSERT INTO villager_state_snapshots (
           villager_id, hunger, energy, happiness,
           current_activity, current_location,
           current_day, current_hour, current_minute,
           last_event_seq, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (villager_id) DO UPDATE SET
           hunger = EXCLUDED.hunger,
           energy = EXCLUDED.energy,
           happiness = EXCLUDED.happiness,
           current_activity = EXCLUDED.current_activity,
           current_location = EXCLUDED.current_location,
           current_day = EXCLUDED.current_day,
           current_hour = EXCLUDED.current_hour,
           current_minute = EXCLUDED.current_minute,
           last_event_seq = EXCLUDED.last_event_seq,
           updated_at = EXCLUDED.updated_at
         WHERE villager_state_snapshots.last_event_seq <= EXCLUDED.last_event_seq`,
        [
          state.id,
          state.hunger,
          state.energy,
          state.happiness,
          state.currentActivity,
          state.currentLocation,
          state.currentDay,
          state.currentHour,
          state.currentMinute,
          state.eventSeq,
          state.lastUpdatedAt,
        ],
      );
    },

    async recordVillagerEvent(input: RecordVillagerEventInput): Promise<{ inserted: boolean }> {
      const meta = getActivityMeta();

      const result = await pool.query(
        `INSERT INTO villager_events (
           id, villager_id, event_type, description,
           occurred_at, in_game_day, in_game_hour, in_game_minute,
           workflow_id, run_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          input.id,
          input.villagerId,
          input.eventType,
          input.description,
          input.occurredAt,
          input.inGameDay,
          input.inGameHour,
          input.inGameMinute,
          input.workflowId,
          input.runId,
        ],
      );

      const inserted = (result.rowCount ?? 0) > 0;
      logger.info(inserted ? 'Recorded villager event' : 'Skipped duplicate villager event', {
        ...meta,
        eventId: input.id,
        eventType: input.eventType,
        inserted,
      });

      return { inserted };
    },

    async sendVillagerNotification(
      input: SendVillagerNotificationInput,
    ): Promise<{ inserted: boolean }> {
      const meta = getActivityMeta();

      const result = await pool.query(
        `INSERT INTO villager_notifications (id, villager_id, title, message, severity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [input.id, input.villagerId, input.title, input.message, input.severity],
      );

      const inserted = (result.rowCount ?? 0) > 0;
      logger.info(
        inserted ? 'Sent villager notification' : 'Skipped duplicate villager notification',
        {
          ...meta,
          notificationId: input.id,
          severity: input.severity,
          inserted,
        },
      );

      return { inserted };
    },
  };
}
