import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { getPool } from '@/lib/db';
import { pingTemporal } from '@/lib/temporal-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getConfig();

  const [dbOk, temporalOk] = await Promise.all([
    getPool()
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false),
    pingTemporal(),
  ]);

  const ok = dbOk && temporalOk;
  return NextResponse.json(
    {
      ok,
      database: dbOk ? 'connected' : 'error',
      temporal: temporalOk ? 'connected' : 'error',
      namespace: config.temporalNamespace,
      taskQueue: config.temporalTaskQueue,
    },
    { status: ok ? 200 : 503 },
  );
}
