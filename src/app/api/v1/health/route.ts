import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Lightweight database connectivity ping
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[HEALTH] Database health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    );
  }
}
