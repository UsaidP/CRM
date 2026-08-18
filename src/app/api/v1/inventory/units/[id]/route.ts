import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { assessUnitFreshness } from '@/lib/domain/verification-engine';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const unit = await prisma.propertyUnit.findUnique({
      where: { id },
      include: {
        project: true,
        verifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
        auditLogs: {
          include: {
            auditorUser: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ success: false, error: 'Property unit not found' }, { status: 404 });
    }

    const freshness = assessUnitFreshness(unit.verificationStatus, unit.lastVerifiedAt);

    return NextResponse.json({
      success: true,
      data: {
        ...unit,
        photoGallery: JSON.parse(unit.photoGalleryJson || '[]'),
        freshness,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.propertyUnit.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Property unit deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
