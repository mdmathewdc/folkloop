import { DEFAULT_MS_PER_IN_GAME_HOUR } from './constants';
import type { ClockConfig, InGameTime } from './types';

export function formatInGameTime(hour: number, minute: number): string {
  const hh = String(Math.floor(hour) % 24).padStart(2, '0');
  const mm = String(Math.floor(minute) % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function createClockConfig(
  startTimeMs: number,
  initialInGameHour = 6.75,
  msPerInGameHour = DEFAULT_MS_PER_IN_GAME_HOUR,
): ClockConfig {
  const safeMsPerHour = Math.max(100, msPerInGameHour);
  const clampedHour = Math.max(0, Math.min(23.99, initialInGameHour));
  return {
    simulationEpochMs: startTimeMs - Math.round(clampedHour * safeMsPerHour),
    msPerInGameHour: safeMsPerHour,
  };
}

export function getInGameTime(nowMs: number, config: ClockConfig): InGameTime {
  const elapsedMs = Math.max(0, nowMs - config.simulationEpochMs);
  const totalHours = elapsedMs / config.msPerInGameHour;
  const day = Math.floor(totalHours / 24) + 1;
  const hourOfDay = totalHours % 24;
  const hour = Math.floor(hourOfDay);
  const minute = Math.floor((hourOfDay - hour) * 60);

  return {
    day,
    hour,
    minute,
    totalHours,
    formattedTime: formatInGameTime(hour, minute),
  };
}

export function getTimestampForInGameTime(
  day: number,
  hour: number,
  config: ClockConfig,
): number {
  const totalHoursFromEpoch = (day - 1) * 24 + hour;
  return config.simulationEpochMs + Math.round(totalHoursFromEpoch * config.msPerInGameHour);
}
