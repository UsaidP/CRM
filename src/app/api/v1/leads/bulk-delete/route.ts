import { NextResponse } from 'next/server';
import { requirePermission, orgScope } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, 'leads:delete');
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const body = await req.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide an array of lead IDs to delete.' },
        { status: 400 }
      );
    }

    // Ensure we only delete leads belonging to this organization
    const deleteResult = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds },
        ...orgScope(session),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} lead(s).`,
      deletedCount: deleteResult.count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete leads.' },
      { status: 500 }
    );
  }
}
