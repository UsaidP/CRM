import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/services/auth-service';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firmName, reraNumber, adminName, email, phoneE164, password } = body;

    // 1. Validation
    if (!firmName || typeof firmName !== 'string' || firmName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Firm / Organization name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (!adminName || typeof adminName !== 'string' || adminName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Principal administrator full name is required.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid official email address is required.' },
        { status: 400 }
      );
    }

    if (!phoneE164 || typeof phoneE164 !== 'string' || phoneE164.trim().length < 8) {
      return NextResponse.json(
        { success: false, error: 'A valid phone number with country code is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = phoneE164.trim().startsWith('+') ? phoneE164.trim() : `+${phoneE164.trim()}`;

    // 2. Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    // 3. Generate unique organization slug
    let baseSlug = slugify(firmName);
    if (!baseSlug) baseSlug = 'realty-firm';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Hash password securely
    const passwordHash = await hashPassword(password);

    // 5. Create Organization and Admin User in transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: firmName.trim(),
          slug: uniqueSlug,
          reraBrokerRegistration: reraNumber?.trim() || null,
          settingsJson: JSON.stringify({
            currency: 'INR',
            state: 'Maharashtra',
            timezone: 'Asia/Kolkata',
            autoDispatch: true,
          }),
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          fullName: adminName.trim(),
          email: normalizedEmail,
          phoneE164: cleanPhone,
          role: 'ADMIN',
          passwordHash,
          isActive: true,
        },
      });

      return { organization, user };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Firm registered and administrator provisioned successfully.',
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API] Firm registration error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to register firm. Please try again.' },
      { status: 500 }
    );
  }
}
