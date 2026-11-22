import { describe, expect, it } from 'vitest';
import {
  createClockConfig,
  formatInGameTime,
  getInGameTime,
  getTimestampForInGameTime,
} from '../src/lib/clock';
import { applyNeedsDelta, clampNeed } from '../src/lib/needs';
import {
  BOB_DAILY_SCHEDULE,
  getInitialStateForHour,
  getNextScheduleSlot,
  scheduleSlotKey,
} from '../src/lib/schedule';

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

  it('advances 1 in-game hour per 1 real minute by default', () => {
    const startMs = 1_700_000_000_000;
    const config = createClockConfig(startMs, 7, 60_000);

    const later = getInGameTime(startMs + 150_000, config);
    expect(later.day).toBe(1);
    expect(later.hour).toBe(9);
    expect(later.minute).toBe(30);

    const nextDay = getInGameTime(startMs + 24 * 60_000, config);
    expect(nextDay.day).toBe(2);
    expect(nextDay.hour).toBe(7);
  });

  it('round-trips timestamps with getTimestampForInGameTime', () => {
    const startMs = 1_700_000_000_000;
    const config = createClockConfig(startMs, 6.5, 60_000);
    const targetMs = getTimestampForInGameTime(3, 12, config);
    const decoded = getInGameTime(targetMs, config);
    expect(decoded.day).toBe(3);
    expect(decoded.hour).toBe(12);
  });

  it('formats HH:MM cleanly', () => {
    expect(formatInGameTime(7, 5)).toBe('07:05');
    expect(formatInGameTime(22, 0)).toBe('22:00');
  });
});

describe('schedule & needs', () => {
  it('contains all 9 daily transitions in sorted order', () => {
    expect(BOB_DAILY_SCHEDULE.map((s) => s.hour)).toEqual([7, 8, 9, 12, 13, 17, 18, 20, 22]);
  });

  it('advances across days cleanly', () => {
    const next = getNextScheduleSlot(scheduleSlotKey(1, 22));
    expect(next.day).toBe(2);
    expect(next.slot.hour).toBe(7);
    expect(next.slot.activity).toBe('WAKING_UP');
  });

  it('resolves initial state for pre-dawn hours as SLEEPING at HOME', () => {
    expect(getInitialStateForHour(6)).toEqual({ activity: 'SLEEPING', location: 'HOME' });
    expect(getInitialStateForHour(10)).toEqual({ activity: 'BAKING', location: 'BAKERY' });
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
