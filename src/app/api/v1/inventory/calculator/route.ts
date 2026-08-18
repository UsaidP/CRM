import { NextResponse } from 'next/server';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';

export async function POST(req: Request) {
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
