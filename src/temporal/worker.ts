import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import pino from 'pino';
import { NativeConnection, Worker } from '@temporalio/worker';
import { VILLAGER_TASK_QUEUE } from '../lib/constants';
import { createVillagerActivities } from './activities';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = pino({
  name: 'folkloop-worker',
  level: process.env.LOG_LEVEL ?? 'info',
});

async function run(): Promise<void> {
  const temporalAddress = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE ?? VILLAGER_TASK_QUEUE;
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgresql://folkloop:folkloop@localhost:5432/folkloop';

  logger.info({ temporalAddress, namespace, taskQueue }, 'Starting Folkloop Temporal Worker...');

  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query('SELECT 1');
  logger.info('Connected to PostgreSQL database');

  const connection = await NativeConnection.connect({ address: temporalAddress });
  logger.info({ temporalAddress }, 'Connected to Temporal server');

  const activities = createVillagerActivities(pool, {
    info: (msg, meta) => logger.info(meta ?? {}, msg),
    warn: (msg, meta) => logger.warn(meta ?? {}, msg),
    error: (msg, meta) => logger.error(meta ?? {}, msg),
  });

  const workflowsPath = path.resolve(__dirname, './workflow.ts');

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath,
    activities,
  });

  const shutdown = (signal: string) => {
    logger.warn({ signal }, 'Shutdown signal received — stopping Temporal Worker...');
    worker.shutdown();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  logger.info({ taskQueue, workflowsPath }, 'Folkloop Temporal Worker polling for tasks');

  try {
    await worker.run();
  } finally {
    await connection.close();
    await pool.end();
    logger.info('Folkloop Temporal Worker stopped cleanly');
  }
}

run().catch((err) => {
  logger.error({ err }, 'Fatal error in Folkloop Temporal Worker');
  process.exit(1);
});
