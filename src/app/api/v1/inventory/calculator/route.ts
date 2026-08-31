import { NextResponse } from 'next/server';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { requireSession } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const result = calculateAllInCost(body);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate cost' },
      { status: 400 }
    );
  }
}
