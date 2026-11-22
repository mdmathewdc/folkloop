import { NextResponse } from 'next/server';
import { inspectBobWorkflow } from '@/lib/temporal-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const inspector = await inspectBobWorkflow();
    return NextResponse.json({ inspector });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'INSPECTOR_ERROR',
        message: err instanceof Error ? err.message : 'Failed to inspect workflow',
      },
      { status: 500 },
    );
  }
}
