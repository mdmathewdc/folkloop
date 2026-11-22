import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { wakeBobWorkflow } from '@/lib/temporal-client';

export const dynamic = 'force-dynamic';

const wakeBodySchema = z
  .object({
    reason: z.string().max(100).optional(),
  })
  .optional();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  const parsed = wakeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      },
      { status: 400 },
    );
  }

  await wakeBobWorkflow(parsed.data);
  return NextResponse.json(
    {
      accepted: true,
      signal: 'wakeVillager',
      message: 'Wake-up signal sent to Bob.',
    },
    { status: 202 },
  );
}
