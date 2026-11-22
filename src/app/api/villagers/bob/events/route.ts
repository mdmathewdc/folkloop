import { NextRequest, NextResponse } from 'next/server';
import { BOB_VILLAGER_ID } from '@/lib/constants';
import { getVillagerEvents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, Math.floor(limitParam))) : 50;
  const events = await getVillagerEvents(BOB_VILLAGER_ID, limit);
  return NextResponse.json({ events });
}
