import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import pino from 'pino';
import { NativeConnection, Worker } from '@temporalio/worker';
import { getConfig, getPgPoolConfig, getTemporalConnectionOptions } from '../lib/config';
import { createVillagerActivities } from './activities';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = pino({
  name: 'folkloop-worker',
  level: process.env.LOG_LEVEL ?? 'info',
});

function startHealthServer(isReady: () => boolean): http.Server | null {
  const portRaw = process.env.WORKER_HEALTH_PORT ?? process.env.PORT;
  if (!portRaw) return null;
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) return null;

  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const ready = isReady();
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: ready, service: 'folkloop-worker' }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'Worker health check endpoint listening on /health');
  });
  return server;
}

async function run(): Promise<void> {
  const config = getConfig();
  const { temporalAddress, temporalNamespace: namespace, temporalTaskQueue: taskQueue } = config;

  let workerReady = false;
  const healthServer = startHealthServer(() => workerReady);

  logger.info(
    { temporalAddress, namespace, taskQueue, tls: config.temporalTls },
    'Starting Folkloop Temporal Worker...',
  );

  const pool = new Pool(getPgPoolConfig(config));
  await pool.query('SELECT 1');
  logger.info({ ssl: config.databaseSsl }, 'Connected to PostgreSQL database');

  const connection = await NativeConnection.connect(getTemporalConnectionOptions(config));
  logger.info({ temporalAddress, tls: config.temporalTls }, 'Connected to Temporal server');

  const activities = createVillagerActivities(pool, {
    info: (msg, meta) => logger.info(meta ?? {}, msg),
    warn: (msg, meta) => logger.warn(meta ?? {}, msg),
    error: (msg, meta) => logger.error(meta ?? {}, msg),
  });

  // Prefer prebuilt workflow bundle in production containers for fast low-RAM startup
  const prebuiltBundlePath = path.resolve(__dirname, '../../dist/workflow-bundle.js');
  const usePrebuiltBundle = fs.existsSync(prebuiltBundlePath);

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    ...(usePrebuiltBundle
      ? { workflowBundle: { codePath: prebuiltBundlePath } }
      : { workflowsPath: path.resolve(__dirname, './workflow.ts') }),
    activities,
  });

  workerReady = true;

  const shutdown = (signal: string) => {
    workerReady = false;
    logger.warn({ signal }, 'Shutdown signal received — stopping Temporal Worker...');
    worker.shutdown();
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  logger.info(
    {
      taskQueue,
      bundleMode: usePrebuiltBundle ? 'prebuilt' : 'runtime-webpack',
    },
    'Folkloop Temporal Worker polling for tasks',
  );

  try {
    await worker.run();
  } finally {
    workerReady = false;
    healthServer?.close();
    await connection.close();
    await pool.end();
    logger.info('Folkloop Temporal Worker stopped cleanly');
  }
}

run().catch((err) => {
  logger.error({ err }, 'Fatal error in Folkloop Temporal Worker');
  process.exit(1);
});
