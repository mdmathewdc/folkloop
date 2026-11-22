import {
  DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS,
  DEFAULT_MS_PER_IN_GAME_HOUR,
  VILLAGER_TASK_QUEUE,
} from './constants';

export interface AppConfig {
  databaseUrl: string;
  temporalAddress: string;
  temporalNamespace: string;
  temporalTaskQueue: string;
  temporalUiUrl: string;
  simulationMsPerHour: number;
  continueAsNewAfterDays: number;
}

export function getConfig(): AppConfig {
  return {
    databaseUrl:
      process.env.DATABASE_URL ?? 'postgresql://folkloop:folkloop@localhost:5432/folkloop',
    temporalAddress: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
    temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
    temporalTaskQueue: process.env.TEMPORAL_TASK_QUEUE ?? VILLAGER_TASK_QUEUE,
    temporalUiUrl: process.env.TEMPORAL_UI_URL ?? 'http://localhost:8233',
    simulationMsPerHour: Number(process.env.SIMULATION_MS_PER_HOUR ?? DEFAULT_MS_PER_IN_GAME_HOUR),
    continueAsNewAfterDays: Number(
      process.env.CONTINUE_AS_NEW_AFTER_DAYS ?? DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS,
    ),
  };
}
