import type {
  VillagerActivity,
  VillagerEventType,
  VillagerLocation,
  VillagerNeeds,
} from './types';

export interface ScheduleSlot {
  hour: number;
  label: string;
  activity: VillagerActivity;
  location: VillagerLocation;
  eventType: VillagerEventType;
  description: string;
  needsDelta: Partial<VillagerNeeds>;
}

export const BOB_DAILY_SCHEDULE: readonly ScheduleSlot[] = [
  {
    hour: 7,
    label: 'Wake up',
    activity: 'WAKING_UP',
    location: 'HOME',
    eventType: 'WOKE_UP',
    description: 'Bob woke up.',
    needsDelta: { hunger: 10, energy: 45, happiness: 5 },
  },
  {
    hour: 8,
    label: 'Walk to bakery',
    activity: 'WALKING',
    location: 'VILLAGE',
    eventType: 'WALKED_TO_BAKERY',
    description: 'Bob walked to the bakery.',
    needsDelta: { hunger: 5, energy: -5, happiness: 2 },
  },
  {
    hour: 9,
    label: 'Start baking',
    activity: 'BAKING',
    location: 'BAKERY',
    eventType: 'STARTED_BAKING',
    description: 'Bob started baking.',
    needsDelta: { hunger: 12, energy: -15, happiness: 4 },
  },
  {
    hour: 12,
    label: 'Eat lunch',
    activity: 'EATING',
    location: 'BAKERY',
    eventType: 'ATE_LUNCH',
    description: 'Bob ate lunch.',
    needsDelta: { hunger: -35, energy: 10, happiness: 8 },
  },
  {
    hour: 13,
    label: 'Resume baking',
    activity: 'BAKING',
    location: 'BAKERY',
    eventType: 'RESUMED_BAKING',
    description: 'Bob resumed baking.',
    needsDelta: { hunger: 15, energy: -20, happiness: 2 },
  },
  {
    hour: 17,
    label: 'Close bakery',
    activity: 'IDLE',
    location: 'BAKERY',
    eventType: 'CLOSED_BAKERY',
    description: 'Bob closed the bakery.',
    needsDelta: { hunger: 8, energy: -8, happiness: 5 },
  },
  {
    hour: 18,
    label: 'Walk home',
    activity: 'WALKING',
    location: 'VILLAGE',
    eventType: 'WALKED_HOME',
    description: 'Bob walked home.',
    needsDelta: { hunger: 5, energy: -5, happiness: 3 },
  },
  {
    hour: 20,
    label: 'Relax',
    activity: 'RELAXING',
    location: 'HOME',
    eventType: 'RELAXED',
    description: 'Bob sat down to relax.',
    needsDelta: { hunger: 5, energy: 8, happiness: 10 },
  },
  {
    hour: 22,
    label: 'Sleep',
    activity: 'SLEEPING',
    location: 'HOME',
    eventType: 'WENT_TO_SLEEP',
    description: 'Bob went to sleep.',
    needsDelta: { hunger: 5, energy: 20, happiness: 2 },
  },
] as const;

export function scheduleSlotKey(day: number, hour: number): number {
  return (day - 1) * 24 + hour;
}

export function getNextScheduleSlot(afterKey: number): {
  day: number;
  slot: ScheduleSlot;
  key: number;
} {
  const baseDay = Math.max(1, Math.floor(Math.max(0, afterKey) / 24) + 1);

  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const day = baseDay + dayOffset;
    for (const slot of BOB_DAILY_SCHEDULE) {
      const key = scheduleSlotKey(day, slot.hour);
      if (key > afterKey) {
        return { day, slot, key };
      }
    }
  }

  const fallbackSlot = BOB_DAILY_SCHEDULE[0];
  return {
    day: baseDay + 1,
    slot: fallbackSlot,
    key: scheduleSlotKey(baseDay + 1, fallbackSlot.hour),
  };
}

export function getInitialStateForHour(hour: number): {
  activity: VillagerActivity;
  location: VillagerLocation;
} {
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
  let activeSlot: ScheduleSlot | null = null;
  for (const slot of BOB_DAILY_SCHEDULE) {
    if (slot.hour <= normalizedHour) {
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
