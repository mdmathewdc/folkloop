import type { PoolConfig } from 'pg';
import {
  DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS,
  DEFAULT_MS_PER_IN_GAME_HOUR,
  VILLAGER_TASK_QUEUE,
} from './constants';

export interface AppConfig {
  databaseUrl: string;
  databaseSsl: boolean;
  temporalAddress: string;
  temporalNamespace: string;
  temporalTaskQueue: string;
  temporalUiUrl: string;
  temporalApiKey?: string;
  temporalTls: boolean;
  temporalTlsCertBase64?: string;
  temporalTlsKeyBase64?: string;
  simulationMsPerHour: number;
  continueAsNewAfterDays: number;
}

export function getConfig(): AppConfig {
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgresql://folkloop:folkloop@localhost:5432/folkloop';

  const temporalApiKey = process.env.TEMPORAL_API_KEY?.trim() || undefined;
  const temporalTlsCertBase64 = process.env.TEMPORAL_TLS_CERT_BASE64?.trim() || undefined;
  const temporalTlsKeyBase64 = process.env.TEMPORAL_TLS_KEY_BASE64?.trim() || undefined;

  const temporalTls =
    process.env.TEMPORAL_TLS === 'true' ||
    Boolean(temporalApiKey) ||
    Boolean(temporalTlsCertBase64 && temporalTlsKeyBase64);

  const databaseSsl =
    process.env.DATABASE_SSL === 'true' ||
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('supabase.co') ||
    databaseUrl.includes('supabase.com');

  const defaultUiUrl = temporalTls ? 'https://cloud.temporal.io' : 'http://localhost:8233';

  return {
    databaseUrl,
    databaseSsl,
    temporalAddress: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',
    temporalNamespace: process.env.TEMPORAL_NAMESPACE ?? 'default',
    temporalTaskQueue: process.env.TEMPORAL_TASK_QUEUE ?? VILLAGER_TASK_QUEUE,
    temporalUiUrl: process.env.TEMPORAL_UI_URL ?? defaultUiUrl,
    temporalApiKey,
    temporalTls,
    temporalTlsCertBase64,
    temporalTlsKeyBase64,
    simulationMsPerHour: Number(process.env.SIMULATION_MS_PER_HOUR ?? DEFAULT_MS_PER_IN_GAME_HOUR),
    continueAsNewAfterDays: Number(
      process.env.CONTINUE_AS_NEW_AFTER_DAYS ?? DEFAULT_CONTINUE_AS_NEW_AFTER_DAYS,
    ),
  };
}

export function getPgPoolConfig(config: AppConfig = getConfig()): PoolConfig {
  return {
    connectionString: config.databaseUrl,
    max: 5,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export function getTemporalConnectionOptions(config: AppConfig = getConfig()) {
  const hasMtls = Boolean(config.temporalTlsCertBase64 && config.temporalTlsKeyBase64);

  const tls = hasMtls
    ? {
        clientCertPair: {
          crt: Buffer.from(config.temporalTlsCertBase64!, 'base64'),
          key: Buffer.from(config.temporalTlsKeyBase64!, 'base64'),
        },
      }
    : config.temporalTls
      ? true
      : undefined;

  return {
    address: config.temporalAddress,
    ...(tls ? { tls } : {}),
    ...(config.temporalApiKey
      ? {
          apiKey: config.temporalApiKey,
          metadata: { 'temporal-namespace': config.temporalNamespace },
        }
      : {}),
  };
}
