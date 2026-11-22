import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  feedBobWorkflow,
  FeedValidationError,
  WorkerUnavailableError,
} from '@/lib/temporal-client';

export const dynamic = 'force-dynamic';

const feedBodySchema = z
  .object({
    amount: z.number().min(5).max(100).optional(),
    foodItem: z.string().min(1).max(60).optional(),
  })
  .optional();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  const parsed = feedBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      },
      { status: 400 },
    );
  }

  try {
    const result = await feedBobWorkflow(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof FeedValidationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    if (err instanceof WorkerUnavailableError) {
      return NextResponse.json(
        {
          error: 'WORKER_OFFLINE',
          message:
            'Cannot validate Feed Update while the Temporal Worker is offline. Restart the Worker and try again.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Feed failed' },
      { status: 500 },
    );
  }
}
