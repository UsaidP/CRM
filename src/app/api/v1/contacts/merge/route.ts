import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import { prisma } from '@/lib/db/prisma';
import { mergeContacts } from '@/lib/domain/contact-manager';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const { sourceContactId, targetContactId, mergedByUserId, reason } = body;

    const organizationId = auth.session.organizationId;

    const result = await mergeContacts({
      organizationId,
      sourceContactId,
      targetContactId,
      mergedByUserId: mergedByUserId || auth.session.userId,
      reason,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const targetContact = await prisma.contact.findFirst({
      where: { id: result.targetContactId, organizationId },
      include: {
        identities: true,
        leads: true,
        assignedBroker: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Contacts merged successfully',
      data: {
        targetContact,
        mergeAuditId: result.auditId,
        mergedIdentitiesCount: result.mergedIdentitiesCount,
        mergedLeadsCount: result.mergedLeadsCount,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to merge contacts');
  }
}
