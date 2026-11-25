import { Pool } from 'pg';
import { getConfig, getPgPoolConfig } from './config';
import type {
  VillagerActivity,
  VillagerEventRecord,
  VillagerEventType,
  VillagerLocation,
  VillagerNotificationRecord,
  VillagerState,
} from './types';

const globalForDb = globalThis as unknown as { __folkloopPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.__folkloopPool) {
    globalForDb.__folkloopPool = new Pool(getPgPoolConfig());
  }
  return globalForDb.__folkloopPool;
}

export async function getVillagerEvents(
  villagerId: string,
  limit = 50,
): Promise<VillagerEventRecord[]> {
  const safeLimit = Math.max(1, Math.min(200, limit));
  const result = await getPool().query<{
    id: string;
    villager_id: string;
    event_type: string;
    description: string;
    occurred_at: Date;
    in_game_day: number;
    in_game_hour: number;
    in_game_minute: number;
    workflow_id: string;
    run_id: string | null;
    created_at: Date;
  }>(
    `SELECT id, villager_id, event_type, description, occurred_at,
            in_game_day, in_game_hour, in_game_minute,
            workflow_id, run_id, created_at
     FROM villager_events
     WHERE villager_id = $1
     ORDER BY in_game_day DESC, in_game_hour DESC, in_game_minute DESC, created_at DESC
     LIMIT $2`,
    [villagerId, safeLimit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    villagerId: row.villager_id,
    eventType: row.event_type as VillagerEventType,
    description: row.description,
    occurredAt: row.occurred_at.toISOString(),
    inGameDay: row.in_game_day,
    inGameHour: row.in_game_hour,
    inGameMinute: row.in_game_minute,
    workflowId: row.workflow_id,
    runId: row.run_id,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getVillagerNotifications(
  villagerId: string,
  limit = 20,
): Promise<VillagerNotificationRecord[]> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const result = await getPool().query<{
    id: string;
    villager_id: string;
    title: string;
    message: string;
    severity: string;
    created_at: Date;
  }>(
    `SELECT id, villager_id, title, message, severity, created_at
     FROM villager_notifications
     WHERE villager_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [villagerId, safeLimit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    villagerId: row.villager_id,
    title: row.title,
    message: row.message,
    severity: row.severity as 'info' | 'warning' | 'success',
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getVillagerSnapshot(villagerId: string): Promise<VillagerState | null> {
  const result = await getPool().query<{
    id: string;
    name: string;
    occupation: string;
    hunger: number;
    energy: number;
    happiness: number;
    current_activity: string;
    current_location: string;
    current_day: number;
    current_hour: number;
    current_minute: number;
    last_event_seq: number;
    updated_at: Date;
  }>(
    `SELECT v.id, v.name, v.occupation,
            s.hunger, s.energy, s.happiness,
            s.current_activity, s.current_location,
            s.current_day, s.current_hour, s.current_minute,
            s.last_event_seq, s.updated_at
     FROM villager_state_snapshots s
     JOIN villagers v ON v.id = s.villager_id
     WHERE s.villager_id = $1`,
    [villagerId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    occupation: row.occupation,
    hunger: row.hunger,
    energy: row.energy,
    happiness: row.happiness,
    currentActivity: row.current_activity as VillagerActivity,
    currentLocation: row.current_location as VillagerLocation,
    currentDay: row.current_day,
    currentHour: row.current_hour,
    currentMinute: row.current_minute,
    lastUpdatedAt: row.updated_at.toISOString(),
    simulationEpochMs: row.updated_at.getTime(),
    msPerInGameHour: getConfig().simulationMsPerHour,
    generation: 1,
    eventSeq: row.last_event_seq,
  };
}
