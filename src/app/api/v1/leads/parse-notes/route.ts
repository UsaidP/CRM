import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { parseLeadNotesWithAI } from '@/lib/services/gemini-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const notes = (body.notes || body.content || body.transcript || '').trim();

    if (!notes || notes.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Please provide lead conversation notes or transcript to parse.' },
        { status: 400 }
      );
    }

    const structuredRequirements = await parseLeadNotesWithAI(notes);

    return NextResponse.json({
      success: true,
      data: structuredRequirements,
      notesLength: notes.length,
    });
  } catch (error: any) {
    console.error('Error in parse-notes API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse lead notes.' },
      { status: 500 }
    );
  }
}
