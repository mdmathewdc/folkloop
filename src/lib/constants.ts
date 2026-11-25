export const BOB_VILLAGER_ID = 'bob';
export const BOB_WORKFLOW_ID = 'villager-bob';
export const VILLAGER_TASK_QUEUE = 'folkloop-villagers';

/** Default: 30 real seconds (30,000 ms) = 1 in-game hour */
export const DEFAULT_MS_PER_IN_GAME_HOUR = 30_000;

/** Default number of in-game days per workflow run before Continue-As-New */
export const DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS = 3;

export const INITIAL_BOB_NEEDS = {
  hunger: 35,
  energy: 85,
  happiness: 75,
} as const;

export const NEED_MIN = 0;
export const NEED_MAX = 100;

export const FEED_DEFAULT_AMOUNT = 30;
export const FEED_HAPPINESS_BOOST = 12;
export const FEED_MIN_HUNGER_THRESHOLD = 5;
export const BREAD_STOLEN_HAPPINESS_PENALTY = 25;
export const WAKE_EARLY_ENERGY_PENALTY = 5;
