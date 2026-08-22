import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projectCount = await prisma.developerProject.count();
    const unitCount = await prisma.propertyUnit.count();

    return NextResponse.json({
      status: 'healthy',
      system: 'ZamZam Properties Real Estate CRM',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        projectCount,
        unitCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    );
  }
}
