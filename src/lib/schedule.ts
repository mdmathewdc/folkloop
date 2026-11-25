import type {
  VillagerActivity,
  VillagerEventType,
  VillagerLocation,
  VillagerNeeds,
} from './types';

export interface ScheduleSlot {
  hour: number;
  minute?: number;
  label: string;
  activity: VillagerActivity;
  location: VillagerLocation;
  eventType: VillagerEventType;
  description: string;
  needsDelta: Partial<VillagerNeeds>;
}

const MINUTES_PER_DAY = 24 * 60;

export const BOB_DAILY_SCHEDULE: readonly ScheduleSlot[] = [
  {
    hour: 7,
    minute: 0,
    label: 'Wake up',
    activity: 'WAKING_UP',
    location: 'HOME',
    eventType: 'WOKE_UP',
    description: 'Bob woke up.',
    needsDelta: { hunger: 5, energy: 30, happiness: 2 },
  },
  {
    hour: 7,
    minute: 30,
    label: 'Tend garden',
    activity: 'GARDENING',
    location: 'GARDEN',
    eventType: 'TENDED_GARDEN',
    description: 'Bob checked the mailbox and watered the flowers.',
    needsDelta: { hunger: 3, energy: -4, happiness: 3 },
  },
  {
    hour: 8,
    minute: 0,
    label: 'Walk to bakery',
    activity: 'WALKING',
    location: 'VILLAGE',
    eventType: 'WALKED_TO_BAKERY',
    description: 'Bob walked to the bakery.',
    needsDelta: { hunger: 3, energy: -4, happiness: 1 },
  },
  {
    hour: 9,
    minute: 0,
    label: 'Start baking',
    activity: 'BAKING',
    location: 'BAKERY',
    eventType: 'STARTED_BAKING',
    description: 'Bob started baking fresh morning loaves.',
    needsDelta: { hunger: 7, energy: -12, happiness: -4 },
  },
  {
    hour: 10,
    minute: 30,
    label: 'Fetch water',
    activity: 'FETCHING_WATER',
    location: 'POND',
    eventType: 'FETCHED_WATER',
    description: 'Bob walked to the pond to fetch fresh water.',
    needsDelta: { hunger: 3, energy: -6, happiness: 1 },
  },
  {
    hour: 11,
    minute: 0,
    label: 'Midday baking',
    activity: 'BAKING',
    location: 'BAKERY',
    eventType: 'RESUMED_BAKING',
    description: 'Bob returned to bake the midday batch.',
    needsDelta: { hunger: 6, energy: -10, happiness: -4 },
  },
  {
    hour: 12,
    minute: 0,
    label: 'Eat lunch',
    activity: 'EATING',
    location: 'BENCH',
    eventType: 'ATE_LUNCH',
    description: 'Bob ate lunch on the village bench.',
    needsDelta: { hunger: -40, energy: 10, happiness: 4 },
  },
  {
    hour: 13,
    minute: 0,
    label: 'Check signpost',
    activity: 'WALKING',
    location: 'VILLAGE',
    eventType: 'CHECKED_SIGNPOST',
    description: 'Bob checked the village signpost.',
    needsDelta: { hunger: 2, energy: -3, happiness: 1 },
  },
  {
    hour: 14,
    minute: 0,
    label: 'Afternoon baking',
    activity: 'BAKING',
    location: 'BAKERY',
    eventType: 'RESUMED_BAKING',
    description: 'Bob resumed afternoon baking.',
    needsDelta: { hunger: 7, energy: -14, happiness: -5 },
  },
  {
    hour: 16,
    minute: 0,
    label: 'Restock flour',
    activity: 'RESTOCKING',
    location: 'BAKERY',
    eventType: 'RESTOCKED_FLOUR',
    description: 'Bob restocked the flour barrel and tidied the bakery.',
    needsDelta: { hunger: 4, energy: -10, happiness: -5 },
  },
  {
    hour: 17,
    minute: 0,
    label: 'Close bakery',
    activity: 'IDLE',
    location: 'BAKERY',
    eventType: 'CLOSED_BAKERY',
    description: 'Bob closed the bakery.',
    needsDelta: { hunger: 3, energy: -5, happiness: 1 },
  },
  {
    hour: 18,
    minute: 0,
    label: 'Sunset stroll',
    activity: 'STROLLING',
    location: 'POND',
    eventType: 'STROLLED_BY_POND',
    description: 'Bob took a sunset stroll by the pond.',
    needsDelta: { hunger: 3, energy: -4, happiness: 3 },
  },
  {
    hour: 19,
    minute: 30,
    label: 'Walk home',
    activity: 'WALKING',
    location: 'VILLAGE',
    eventType: 'WALKED_HOME',
    description: 'Bob walked home.',
    needsDelta: { hunger: 3, energy: -4, happiness: 1 },
  },
  {
    hour: 20,
    minute: 0,
    label: 'Relax',
    activity: 'RELAXING',
    location: 'HOME',
    eventType: 'RELAXED',
    description: 'Bob relaxed outside his cottage.',
    needsDelta: { hunger: 2, energy: 8, happiness: 3 },
  },
  {
    hour: 22,
    minute: 0,
    label: 'Sleep',
    activity: 'SLEEPING',
    location: 'HOME',
    eventType: 'WENT_TO_SLEEP',
    description: 'Bob went to sleep.',
    needsDelta: { hunger: 3, energy: 28, happiness: 1 },
  },
] as const;

export function scheduleSlotKey(day: number, hour: number, minute = 0): number {
  return ((day - 1) * 24 + hour) * 60 + minute;
}

export function getNextScheduleSlot(afterKey: number): {
  day: number;
  slot: ScheduleSlot;
  key: number;
} {
  const baseDay = Math.max(1, Math.floor(Math.max(0, afterKey) / MINUTES_PER_DAY) + 1);

  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const day = baseDay + dayOffset;
    for (const slot of BOB_DAILY_SCHEDULE) {
      const key = scheduleSlotKey(day, slot.hour, slot.minute ?? 0);
      if (key > afterKey) {
        return { day, slot, key };
      }
    }
  }

  const fallbackSlot = BOB_DAILY_SCHEDULE[0];
  return {
    day: baseDay + 1,
    slot: fallbackSlot,
    key: scheduleSlotKey(baseDay + 1, fallbackSlot.hour, fallbackSlot.minute ?? 0),
  };
}

export function getInitialStateForHour(
  hour: number,
  minute = 0,
): {
  activity: VillagerActivity;
  location: VillagerLocation;
} {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
  const normalizedMinute = Math.max(0, Math.min(59, Math.floor(minute)));
  const targetMinutes = normalizedHour * 60 + normalizedMinute;
  let activeSlot: ScheduleSlot | null = null;
  for (const slot of BOB_DAILY_SCHEDULE) {
    const slotMinutes = slot.hour * 60 + (slot.minute ?? 0);
    if (slotMinutes <= targetMinutes) {
      activeSlot = slot;
    }
  }
  if (!activeSlot) {
    return { activity: 'SLEEPING', location: 'HOME' };
  }
  return {
    activity: activeSlot.activity,
    location: activeSlot.location,
  };
}
