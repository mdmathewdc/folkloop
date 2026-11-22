import { NextResponse } from 'next/server';
import { BOB_VILLAGER_ID } from '@/lib/constants';
import { getVillagerSnapshot } from '@/lib/db';
import { queryBobState, WorkerUnavailableError } from '@/lib/temporal-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await queryBobState(2500);
    return NextResponse.json({
      state,
      source: 'temporal_query' as const,
      workerOnline: true,
    });
  } catch (err) {
    if (err instanceof WorkerUnavailableError) {
      const snapshot = await getVillagerSnapshot(BOB_VILLAGER_ID);
      if (snapshot) {
        return NextResponse.json({
          state: snapshot,
          source: 'postgres_snapshot' as const,
          workerOnline: false,
          warning:
            'Temporal Worker is currently offline. Displaying last persisted PostgreSQL snapshot while Temporal Server retains pending timers.',
        });
      }
      return NextResponse.json(
        {
          error: 'WORKER_OFFLINE',
          message:
            'Temporal Worker is offline and no persisted snapshot exists yet. Start the Worker to initialize Bob.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: 'TEMPORAL_ERROR',
        message: err instanceof Error ? err.message : 'Failed to query Bob state',
      },
      { status: 500 },
    );
  }
}
