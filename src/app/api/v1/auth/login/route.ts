import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
  verifySuperAdminKey,
} from '@/lib/services/auth-service';
import { getUserEffectivePermissions } from '@/lib/domain/rbac-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, email, password, superAdminKey } = body;

    // 1. SUPER ADMIN KEY LOGIN
    if (type === 'SUPER_ADMIN_KEY' || (!email && superAdminKey)) {
      if (!superAdminKey || !verifySuperAdminKey(superAdminKey)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Super Admin Secret Key' },
          { status: 401 }
        );
      }

      // Find or create default Super Admin user record
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@zamzamproperties.in';
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: 'ZamZam Properties Real Estate Advisory',
            slug: 'zamzam-properties',
            reraBrokerRegistration: 'A52000029381',
          },
        });
      }

      let superAdminUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });

      if (!superAdminUser) {
        superAdminUser = await prisma.user.create({
          data: {
            organizationId: org.id,
            fullName: 'Super Administrator',
            email: superAdminEmail,
            phoneE164: '+919820123456',
            role: 'SUPER_ADMIN',
          },
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: superAdminUser.id },
        data: { lastLoginAt: new Date() },
      });

      const sessionToken = await createSessionToken({
        userId: superAdminUser.id,
        email: superAdminUser.email,
        fullName: superAdminUser.fullName,
        role: 'SUPER_ADMIN',
        organizationId: superAdminUser.organizationId,
        isSuperAdmin: true,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: superAdminUser.id,
          fullName: superAdminUser.fullName,
          email: superAdminUser.email,
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          effectivePermissions: getUserEffectivePermissions(superAdminUser),
        },
      });

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return response;
    }

    // 2. EMAIL + PASSWORD LOGIN
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact your Super Administrator.' },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'No password set yet. Please check your activation link or use Forgot Password.',
          needsPasswordSetup: true,
        },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
      organizationId: user.organizationId,
      isSuperAdmin,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneE164: user.phoneE164,
        isSuperAdmin,
        effectivePermissions: getUserEffectivePermissions(user),
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Authentication error' },
      { status: 500 }
    );
  }
}
