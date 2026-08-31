import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyUnitSchema } from '@/lib/validators/inventory-schemas';
import { canTransitionStatus, validateReraNumber, VerificationStatus } from '@/lib/domain/verification-engine';
import { calculateAllInCost } from '@/lib/domain/cost-calculator';
import { requireSession } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const validated = verifyUnitSchema.parse(body);

    const unit = await prisma.propertyUnit.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!unit) {
      return NextResponse.json({ success: false, error: 'Property unit not found' }, { status: 404 });
    }

    // Check RERA Validity
    const reraValidation = validateReraNumber(unit.project.reraNumber);
    const transitionCheck = canTransitionStatus(
      unit.verificationStatus as VerificationStatus,
      validated.targetStatus as VerificationStatus,
      reraValidation.isValid
    );

    if (!transitionCheck.allowed) {
      return NextResponse.json(
        { success: false, error: transitionCheck.reason },
        { status: 422 }
      );
    }

    // Fetch or create default auditor user if none passed
    let auditor = await prisma.user.findFirst();
    if (!auditor) {
      const org = await prisma.organization.findFirst();
      auditor = await prisma.user.create({
        data: {
          organizationId: org?.id || unit.project.organizationId,
          fullName: 'Usaid Patel (Broker Admin)',
          email: 'admin@zamzamproperties.in',
          phoneE164: '+919820123456',
          role: 'SUPER_ADMIN',
        },
      });
    }

    // Optional price update during audit
    let newAgreement = unit.agreementValue;
    let newAllIn = unit.allInTotalCost;
    if (validated.updatedAgreementValue && validated.updatedAgreementValue !== unit.agreementValue) {
      newAgreement = validated.updatedAgreementValue;
      const reCalc = calculateAllInCost({
        agreementValue: newAgreement,
        hasOccupancyCertificate: unit.project.hasOccupancyCertificate,
        floorNumber: unit.floorNumber,
        carpetAreaSqft: unit.carpetAreaSqft,
        parkingCharges: unit.parkingCharges,
        societyDevCharges: unit.societyDevelopmentCharges,
      });
      newAllIn = reCalc.totalAllInCost;
    }

    // Update Unit and write to Audit Trail in a transaction
    const [updatedUnit, auditLog] = await prisma.$transaction([
      prisma.propertyUnit.update({
        where: { id },
        data: {
          verificationStatus: validated.targetStatus,
          verifiedByUserId: auditor.id,
          lastVerifiedAt: new Date(),
          agreementValue: newAgreement,
          allInTotalCost: newAllIn,
          verificationNotes: validated.auditNotes,
        },
        include: {
          project: true,
          verifiedBy: true,
        },
      }),
      prisma.inventoryAuditLog.create({
        data: {
          propertyUnitId: id,
          auditorUserId: auditor.id,
          previousStatus: unit.verificationStatus,
          newStatus: validated.targetStatus,
          priceChangedFrom: unit.agreementValue !== newAgreement ? unit.agreementValue : null,
          priceChangedTo: unit.agreementValue !== newAgreement ? newAgreement : null,
          auditNotes: validated.auditNotes,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Property unit transitioned to ${validated.targetStatus}`,
      data: {
        unit: updatedUnit,
        auditLog,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.errors || error.message || 'Failed to verify unit' },
      { status: 400 }
    );
  }
}
