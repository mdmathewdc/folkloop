import { describe, expect, it } from 'vitest';
import {
  createClockConfig,
  formatInGameTime,
  getInGameTime,
  getTimestampForInGameTime,
} from '../src/lib/clock';
import { INITIAL_BOB_NEEDS } from '../src/lib/constants';
import { applyNeedsDelta, clampNeed } from '../src/lib/needs';
import {
  BOB_DAILY_SCHEDULE,
  getInitialStateForHour,
  getNextScheduleSlot,
  scheduleSlotKey,
} from '../src/lib/schedule';
import type { VillagerNeeds } from '../src/lib/types';

describe('clock', () => {
  it('anchors simulationEpochMs to Day 1 at initialInGameHour', () => {
    const startMs = 1_700_000_000_000;
    const config = createClockConfig(startMs, 7, 60_000);
    const time = getInGameTime(startMs, config);
    expect(time.day).toBe(1);
    expect(time.hour).toBe(7);
    expect(time.minute).toBe(0);
    expect(time.formattedTime).toBe('07:00');
  });

  it('advances 1 in-game hour per configured msPerInGameHour', () => {
    const startMs = 1_700_000_000_000;
    const config = createClockConfig(startMs, 7, 60_000);

    const later = getInGameTime(startMs + 150_000, config);
    expect(later.day).toBe(1);
    expect(later.hour).toBe(9);
    expect(later.minute).toBe(30);

    const nextDay = getInGameTime(startMs + 24 * 60_000, config);
    expect(nextDay.day).toBe(2);
    expect(nextDay.hour).toBe(7);

    const fastConfig = createClockConfig(startMs, 7, 30_000);
    const halfHourLater = getInGameTime(startMs + 15_000, fastConfig);
    expect(halfHourLater.day).toBe(1);
    expect(halfHourLater.hour).toBe(7);
    expect(halfHourLater.minute).toBe(30);
  });

  it('round-trips timestamps with getTimestampForInGameTime for whole and half hours', () => {
    const startMs = 1_700_000_000_000;
    const config = createClockConfig(startMs, 6.5, 60_000);

    const wholeHourMs = getTimestampForInGameTime(3, 12, config);
    const decodedWhole = getInGameTime(wholeHourMs, config);
    expect(decodedWhole.day).toBe(3);
    expect(decodedWhole.hour).toBe(12);
    expect(decodedWhole.minute).toBe(0);

    const halfHourMs = getTimestampForInGameTime(2, 10, config, 30);
    const decodedHalf = getInGameTime(halfHourMs, config);
    expect(decodedHalf.day).toBe(2);
    expect(decodedHalf.hour).toBe(10);
    expect(decodedHalf.minute).toBe(30);

    const fastConfig = createClockConfig(startMs, 6.5, 30_000);
    const fastHalfMs = getTimestampForInGameTime(1, 19, fastConfig, 30);
    const decodedFastHalf = getInGameTime(fastHalfMs, fastConfig);
    expect(decodedFastHalf.day).toBe(1);
    expect(decodedFastHalf.hour).toBe(19);
    expect(decodedFastHalf.minute).toBe(30);
  });

  it('formats HH:MM cleanly', () => {
    expect(formatInGameTime(7, 5)).toBe('07:05');
    expect(formatInGameTime(22, 0)).toBe('22:00');
  });
});

describe('schedule & needs', () => {
  it('contains all 15 daily transitions in sorted order including half-hour slots', () => {
    expect(BOB_DAILY_SCHEDULE).toHaveLength(15);
    expect(BOB_DAILY_SCHEDULE.map((s) => formatInGameTime(s.hour, s.minute ?? 0))).toEqual([
      '07:00',
      '07:30',
      '08:00',
      '09:00',
      '10:30',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '16:00',
      '17:00',
      '18:00',
      '19:30',
      '20:00',
      '22:00',
    ]);
    expect(BOB_DAILY_SCHEDULE.map((s) => s.eventType)).toEqual([
      'WOKE_UP',
      'TENDED_GARDEN',
      'WALKED_TO_BAKERY',
      'STARTED_BAKING',
      'FETCHED_WATER',
      'RESUMED_BAKING',
      'ATE_LUNCH',
      'CHECKED_SIGNPOST',
      'RESUMED_BAKING',
      'RESTOCKED_FLOUR',
      'CLOSED_BAKERY',
      'STROLLED_BY_POND',
      'WALKED_HOME',
      'RELAXED',
      'WENT_TO_SLEEP',
    ]);
  });

  it('advances across half-hour slots and across days cleanly', () => {
    const afterWake = getNextScheduleSlot(scheduleSlotKey(1, 7, 0));
    expect(afterWake.day).toBe(1);
    expect(afterWake.slot.hour).toBe(7);
    expect(afterWake.slot.minute).toBe(30);
    expect(afterWake.slot.activity).toBe('GARDENING');
    expect(afterWake.slot.location).toBe('GARDEN');

    const afterMorningBake = getNextScheduleSlot(scheduleSlotKey(1, 9, 0));
    expect(afterMorningBake.day).toBe(1);
    expect(afterMorningBake.slot.hour).toBe(10);
    expect(afterMorningBake.slot.minute).toBe(30);
    expect(afterMorningBake.slot.activity).toBe('FETCHING_WATER');
    expect(afterMorningBake.slot.location).toBe('POND');

    const afterStroll = getNextScheduleSlot(scheduleSlotKey(1, 18, 0));
    expect(afterStroll.day).toBe(1);
    expect(afterStroll.slot.hour).toBe(19);
    expect(afterStroll.slot.minute).toBe(30);
    expect(afterStroll.slot.activity).toBe('WALKING');
    expect(afterStroll.slot.location).toBe('VILLAGE');

    const nextDay = getNextScheduleSlot(scheduleSlotKey(1, 22, 0));
    expect(nextDay.day).toBe(2);
    expect(nextDay.slot.hour).toBe(7);
    expect(nextDay.slot.minute).toBe(0);
    expect(nextDay.slot.activity).toBe('WAKING_UP');
  });

  it('resolves initial state accurately for whole and half-hour boundaries', () => {
    expect(getInitialStateForHour(6)).toEqual({ activity: 'SLEEPING', location: 'HOME' });
    expect(getInitialStateForHour(7, 0)).toEqual({ activity: 'WAKING_UP', location: 'HOME' });
    expect(getInitialStateForHour(7, 30)).toEqual({ activity: 'GARDENING', location: 'GARDEN' });
    expect(getInitialStateForHour(10)).toEqual({ activity: 'BAKING', location: 'BAKERY' });
    expect(getInitialStateForHour(10, 30)).toEqual({
      activity: 'FETCHING_WATER',
      location: 'POND',
    });
    expect(getInitialStateForHour(12, 0)).toEqual({ activity: 'EATING', location: 'BENCH' });
    expect(getInitialStateForHour(19, 30)).toEqual({ activity: 'WALKING', location: 'VILLAGE' });
  });

  it('keeps Bob needs balanced over a full 24-hour day', () => {
    let needs: VillagerNeeds = { ...INITIAL_BOB_NEEDS };
    for (const slot of BOB_DAILY_SCHEDULE) {
      needs = applyNeedsDelta(needs, slot.needsDelta);
    }
    expect(needs.hunger).toBeGreaterThan(0);
    expect(needs.hunger).toBeLessThan(100);
    expect(needs.energy).toBeGreaterThan(0);
    expect(needs.energy).toBeLessThan(100);
    expect(needs.happiness).toBeGreaterThan(0);
    expect(needs.happiness).toBeLessThan(100);
  });

  it('clamps needs between 0 and 100', () => {
    expect(clampNeed(-10)).toBe(0);
    expect(clampNeed(150)).toBe(100);
    expect(
      applyNeedsDelta(
        { hunger: 10, energy: 95, happiness: 5 },
        { hunger: -30, energy: 20, happiness: -25 },
      ),
    ).toEqual({ hunger: 0, energy: 100, happiness: 0 });
  });
});
