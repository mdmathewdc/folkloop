import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import type { VillagerState } from '../src/lib/types';
import { createVillagerActivities } from '../src/temporal/activities';

function createFakePool() {
  const villagers = new Map<string, { id: string; name: string; occupation: string }>();
  const events = new Map<string, Record<string, unknown>>();
  const notifications = new Map<string, Record<string, unknown>>();
  const snapshots = new Map<
    string,
    { last_event_seq: number; current_activity: string; hunger: number }
  >();

  const pool = {
    async query(sql: string, params: unknown[] = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized.startsWith('INSERT INTO villagers')) {
        const [id, name, occupation] = params as [string, string, string];
        if (!villagers.has(id)) {
          villagers.set(id, { id, name, occupation });
          return { rowCount: 1, rows: [{ id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith('INSERT INTO villager_events')) {
        const [id] = params as [string];
        if (events.has(id)) return { rowCount: 0, rows: [] };
        events.set(id, { id, params });
        return { rowCount: 1, rows: [{ id }] };
      }
      if (normalized.startsWith('INSERT INTO villager_notifications')) {
        const [id] = params as [string];
        if (notifications.has(id)) return { rowCount: 0, rows: [] };
        notifications.set(id, { id, params });
        return { rowCount: 1, rows: [{ id }] };
      }
      if (normalized.startsWith('INSERT INTO villager_state_snapshots')) {
        const [villagerId, hunger, , , currentActivity, , , , , lastEventSeq] = params as [
          string,
          number,
          number,
          number,
          string,
          string,
          number,
          number,
          number,
          number,
        ];
        const existing = snapshots.get(villagerId);
        if (!existing || existing.last_event_seq <= lastEventSeq) {
          snapshots.set(villagerId, {
            last_event_seq: lastEventSeq,
            current_activity: currentActivity,
            hunger,
          });
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
  } as unknown as Pool;

  return { pool, events, notifications, snapshots };
}

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

function makeState(overrides: Partial<VillagerState> = {}): VillagerState {
  return {
    id: 'bob',
    name: 'Bob',
    occupation: 'Baker',
    hunger: 40,
    energy: 80,
    happiness: 75,
    currentActivity: 'BAKING',
    currentLocation: 'BAKERY',
    currentDay: 1,
    currentHour: 9,
    currentMinute: 0,
    lastUpdatedAt: new Date().toISOString(),
    simulationEpochMs: 1_700_000_000_000,
    msPerInGameHour: 60_000,
    generation: 1,
    eventSeq: 5,
    ...overrides,
  };
}

describe('Temporal Activities Idempotency', () => {
  it('deduplicates repeated recordVillagerEvent calls', async () => {
    const { pool, events } = createFakePool();
    const activities = createVillagerActivities(pool, silentLogger);
    const payload = {
      id: 'bob:d1:h9:STARTED_BAKING',
      villagerId: 'bob',
      eventType: 'STARTED_BAKING' as const,
      description: 'Bob started baking.',
      occurredAt: new Date().toISOString(),
      inGameDay: 1,
      inGameHour: 9,
      inGameMinute: 0,
      workflowId: 'villager-bob',
      runId: 'run-1',
    };

    expect((await activities.recordVillagerEvent(payload)).inserted).toBe(true);
    expect((await activities.recordVillagerEvent(payload)).inserted).toBe(false);
    expect(events.size).toBe(1);
  });

  it('deduplicates repeated sendVillagerNotification calls', async () => {
    const { pool, notifications } = createFakePool();
    const activities = createVillagerActivities(pool, silentLogger);
    const notif = {
      id: 'bob:notif:bread-stolen:4',
      villagerId: 'bob',
      title: 'Bread Stolen!',
      message: 'Someone stole Bob bread',
      severity: 'warning' as const,
    };

    expect((await activities.sendVillagerNotification(notif)).inserted).toBe(true);
    expect((await activities.sendVillagerNotification(notif)).inserted).toBe(false);
    expect(notifications.size).toBe(1);
  });

  it('prevents stale retried persistVillagerState writes from overwriting newer snapshots', async () => {
    const { pool, snapshots } = createFakePool();
    const activities = createVillagerActivities(pool, silentLogger);

    await activities.persistVillagerState({
      state: makeState({ eventSeq: 10, currentActivity: 'BAKING', hunger: 55 }),
    });
    await activities.persistVillagerState({
      state: makeState({ eventSeq: 8, currentActivity: 'WALKING', hunger: 40 }),
    });

    const stored = snapshots.get('bob');
    expect(stored?.last_event_seq).toBe(10);
    expect(stored?.current_activity).toBe('BAKING');
    expect(stored?.hunger).toBe(55);
  });
});
