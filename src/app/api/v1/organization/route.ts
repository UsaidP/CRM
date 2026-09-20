import { NextResponse } from 'next/server';
import { prisma, ensureSchemaUpToDate } from '@/lib/db/prisma';
import { requireSession, requireRole } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/organization
 * Retrieve details of the authenticated user's organization.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) return auth.response;
    const { session } = auth;
    await ensureSchemaUpToDate();

    let org: any;
    try {
      org = await prisma.organization.findUnique({
        where: { id: session.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          reraBrokerRegistration: true,
          youtubeUrl: true,
          instagramUrl: true,
          settingsJson: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch {
      // Graceful fallback if new social columns are not yet provisioned
      org = await prisma.organization.findUnique({
        where: { id: session.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          reraBrokerRegistration: true,
          settingsJson: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (org) {
        org.youtubeUrl = null;
        org.instagramUrl = null;
      }
    }

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, organization: org });
  } catch (error: any) {
    console.error('[API] Error fetching organization:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/organization
 * Update firm name, RERA registration, and operational settings.
 * Restricted to ADMIN and SUPER_ADMIN roles.
 */
export async function PATCH(req: Request) {
  try {
    const auth = await requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth.ok) return auth.response;
    const { session } = auth;
    await ensureSchemaUpToDate();
    const body = await req.json();
    const { name, reraBrokerRegistration, youtubeUrl, instagramUrl, settingsJson } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Firm name must be at least 2 characters long' },
          { status: 400 }
        );
      }
      dataToUpdate.name = name.trim();
    }

    if (reraBrokerRegistration !== undefined) {
      dataToUpdate.reraBrokerRegistration =
        typeof reraBrokerRegistration === 'string' && reraBrokerRegistration.trim().length > 0
          ? reraBrokerRegistration.trim()
          : null;
    }

    if (youtubeUrl !== undefined) {
      dataToUpdate.youtubeUrl =
        typeof youtubeUrl === 'string' && youtubeUrl.trim().length > 0
          ? youtubeUrl.trim()
          : null;
    }

    if (instagramUrl !== undefined) {
      dataToUpdate.instagramUrl =
        typeof instagramUrl === 'string' && instagramUrl.trim().length > 0
          ? instagramUrl.trim()
          : null;
    }

    if (settingsJson !== undefined) {
      if (typeof settingsJson === 'string') {
        try {
          JSON.parse(settingsJson); // Validate JSON format
          dataToUpdate.settingsJson = settingsJson;
        } catch {
          return NextResponse.json(
            { success: false, error: 'settingsJson must be a valid JSON string' },
            { status: 400 }
          );
        }
      } else if (typeof settingsJson === 'object' && settingsJson !== null) {
        dataToUpdate.settingsJson = JSON.stringify(settingsJson);
      }
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: session.organizationId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        slug: true,
        reraBrokerRegistration: true,
        youtubeUrl: true,
        instagramUrl: true,
        settingsJson: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Organization profile updated successfully',
      organization: updatedOrg,
    });
  } catch (error: any) {
    console.error('[API] Error updating organization:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update organization' },
      { status: 500 }
    );
  }
}
