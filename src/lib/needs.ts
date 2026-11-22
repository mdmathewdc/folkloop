import { NEED_MAX, NEED_MIN } from './constants';
import type { VillagerNeeds } from './types';

export function clampNeed(value: number): number {
  if (!Number.isFinite(value)) return NEED_MIN;
  return Math.max(NEED_MIN, Math.min(NEED_MAX, Math.round(value)));
}

export function applyNeedsDelta(
  current: VillagerNeeds,
  delta: Partial<VillagerNeeds>,
): VillagerNeeds {
  return {
    hunger: clampNeed(current.hunger + (delta.hunger ?? 0)),
    energy: clampNeed(current.energy + (delta.energy ?? 0)),
    happiness: clampNeed(current.happiness + (delta.happiness ?? 0)),
  };
}
