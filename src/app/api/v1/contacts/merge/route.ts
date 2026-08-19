import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { mergeContacts } from '@/lib/domain/contact-manager';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceContactId, targetContactId, mergedByUserId, reason } = body;

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
    }

    const result = await mergeContacts({
      organizationId: org.id,
      sourceContactId,
      targetContactId,
      mergedByUserId,
      reason,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const targetContact = await prisma.contact.findUnique({
      where: { id: result.targetContactId },
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
