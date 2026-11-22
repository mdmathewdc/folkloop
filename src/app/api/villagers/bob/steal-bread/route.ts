import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stealBreadWorkflow } from '@/lib/temporal-client';

export const dynamic = 'force-dynamic';

const stealBreadBodySchema = z
  .object({
    thief: z.string().min(1).max(40).optional(),
    loaves: z.number().int().min(1).max(10).optional(),
  })
  .optional();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => undefined);
  const parsed = stealBreadBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? 'Invalid request body',
      },
      { status: 400 },
    );
  }

  await stealBreadWorkflow(parsed.data);
  return NextResponse.json(
    {
      accepted: true,
      signal: 'breadStolen',
      message: 'Bread theft signal sent! Bob will notice right away.',
    },
    { status: 202 },
  );
}
