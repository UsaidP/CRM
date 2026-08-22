import { NextRequest, NextResponse } from 'next/server';
import { syncAllLeadFallbacks, escalateOverdueReminders } from '@/lib/services/lead-reminder-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let organizationId: string | undefined;

    try {
      const body = await req.json();
      organizationId = body?.organizationId;
    } catch {
      // json body optional
    }

    const [syncResult, escalateResult] = await Promise.all([
      syncAllLeadFallbacks(organizationId),
      escalateOverdueReminders(organizationId),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Fallback reminders synchronized and overdue items escalated successfully',
      data: {
        fallbackSync: syncResult,
        escalation: escalateResult,
      },
    });
  } catch (error: any) {
    console.error('Error running fallback sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync fallback reminders' },
      { status: 500 }
    );
  }
}
