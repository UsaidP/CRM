import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { validateReraNumber } from '@/lib/domain/verification-engine';

export const dynamic = 'force-dynamic';

async function performVerification(reraInput: string, excludeProjectId?: string) {
  const validation = validateReraNumber(reraInput);

  if (!validation.isValid) {
    return {
      success: true,
      ...validation,
      duplicateInCrm: false,
      existingProject: null,
    };
  }

  const normalized = validation.normalized || reraInput.trim().toUpperCase();

  // Check if project with this RERA number already exists in CRM
  let existingProject = null;
  try {
    existingProject = await prisma.developerProject.findFirst({
      where: {
        reraNumber: normalized,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
      },
      select: {
        id: true,
        projectName: true,
        developerName: true,
        microMarket: true,
        reraNumber: true,
        hasOccupancyCertificate: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.error('Error querying existing project for RERA verification:', err);
  }

  return {
    success: true,
    ...validation,
    duplicateInCrm: Boolean(existingProject),
    existingProject: existingProject
      ? {
          id: existingProject.id,
          projectName: existingProject.projectName,
          developerName: existingProject.developerName,
          microMarket: existingProject.microMarket,
          reraNumber: existingProject.reraNumber,
          hasOccupancyCertificate: existingProject.hasOccupancyCertificate,
          updatedAt: existingProject.updatedAt,
        }
      : null,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reraNumber = searchParams.get('reraNumber') || searchParams.get('rera') || searchParams.get('q') || '';
    const excludeProjectId = searchParams.get('excludeProjectId') || undefined;

    if (!reraNumber.trim()) {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: 'Please provide a RERA registration number to verify.',
        },
        { status: 400 }
      );
    }

    const result = await performVerification(reraNumber, excludeProjectId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'RERA verification could not be completed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const reraNumber = (body.reraNumber || body.rera || '').trim();
    const excludeProjectId = body.projectId || body.excludeProjectId || undefined;

    if (!reraNumber) {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: 'Please provide a RERA registration number to verify.',
        },
        { status: 400 }
      );
    }

    const result = await performVerification(reraNumber, excludeProjectId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'RERA verification could not be completed.' },
      { status: 500 }
    );
  }
}
