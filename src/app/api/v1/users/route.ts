import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserEffectivePermissions } from '@/lib/domain/rbac-engine';
import { requireRole, orgScope } from '@/lib/services/api-auth';

export const dynamic = 'force-dynamic';

// Only Super Admins and Broker Managers may manage team members.
const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'BROKER_MANAGER'] as const;

export async function GET(req: Request) {
  try {
    const auth = await requireRole(req, [...MANAGEMENT_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const users = await prisma.user.findMany({
      where: orgScope(session),
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            assignedLeads: true,
            dealsClosed: true,
            siteVisitsHosted: true,
          },
        },
      },
    });

    const enrichedUsers = users.map((u) => ({
      ...u,
      effectivePermissions: getUserEffectivePermissions(u),
    }));

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(req, [...MANAGEMENT_ROLES]);
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const body = await req.json();
    const { fullName, email, phoneE164, role, customPermissions } = body;

    if (!fullName || !email || !phoneE164) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and mobile number are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneE164.trim();

    // Check if user already exists (within this organization)
    const existingUser = await prisma.user.findFirst({
      where: orgScope(session, {
        OR: [{ email: cleanEmail }, { phoneE164: cleanPhone }],
      }),
    });

    if (existingUser) {
      // Update existing user with new details & role
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: fullName.trim(),
          role: role || existingUser.role,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          ...updatedUser,
          effectivePermissions: getUserEffectivePermissions(updatedUser),
        },
        message: 'Existing team member updated successfully',
      });
    }

    // Create the user inside the caller's organization
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }
    const { generateSecureToken } = await import('@/lib/services/auth-service');
    const inviteToken = generateSecureToken();
    const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newUser = await prisma.user.create({
      data: {
        organizationId: org.id,
        fullName: fullName.trim(),
        email: cleanEmail,
        phoneE164: cleanPhone,
        role: role || 'TELECALLER',
        customPermissionsJson: customPermissions ? JSON.stringify(customPermissions) : '[]',
        isActive: true,
        inviteToken,
        inviteTokenExpiresAt,
      },
    });

    const inviteUrl = `/set-password?token=${inviteToken}`;

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        effectivePermissions: getUserEffectivePermissions(newUser),
      },
      inviteToken,
      inviteUrl,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A team member with this email or phone number already exists.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
