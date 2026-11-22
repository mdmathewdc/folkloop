import { NextRequest, NextResponse } from 'next/server';
import { BOB_VILLAGER_ID } from '@/lib/constants';
import { getVillagerNotifications } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '20');
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, Math.floor(limitParam))) : 20;
  const notifications = await getVillagerNotifications(BOB_VILLAGER_ID, limit);
  return NextResponse.json({ notifications });
}
