import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/services/api-auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/services/auth-service';
import { generateFullBackup, getAvailableBackups } from '@/lib/services/backup-service';

export const dynamic = 'force-dynamic';

// GET /api/v1/admin/backup - Retrieve backup status and past backups
export async function GET(req: Request) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    let currentUser: any = null;

    if (sessionCookie) {
      const payload = await verifySessionToken(sessionCookie);
      if (payload) {
        currentUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, fullName: true, role: true, email: true },
        });
      }
    }

    const backups = getAvailableBackups();
    const totalLeads = await prisma.lead.count();
    const totalContacts = await prisma.contact.count();
    const totalVisits = await prisma.siteVisit.count();
    const totalDeals = await prisma.dealTransaction.count();
    const totalReminders = await prisma.leadReminder.count();

    return NextResponse.json({
      success: true,
      backups,
      lastBackup: backups[0] || null,
      gdriveFolderUrl: process.env.GOOGLE_DRIVE_FOLDER_URL || 'https://drive.google.com/drive/my-drive',
      gdriveConfigured: Boolean(process.env.GOOGLE_DRIVE_WEBHOOK_URL || process.env.GOOGLE_DRIVE_FOLDER_URL),
      databaseStats: {
        totalLeads,
        totalContacts,
        totalVisits,
        totalDeals,
        totalReminders,
      },
      currentUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch backup status' },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/backup - Trigger instant backup / duty-end backup to Google Drive
export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    let currentUser: any = null;

    if (sessionCookie) {
      const payload = await verifySessionToken(sessionCookie);
      if (payload) {
        currentUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, fullName: true, role: true, email: true },
        });
      }
    }

    let body: { dutyEnd?: boolean; notes?: string } = {};
    try {
      body = await req.json();
    } catch {}

    const result = await generateFullBackup({
      userId: currentUser?.id,
      userName: currentUser?.fullName || 'Active Duty Agent',
      role: currentUser?.role || 'TELECALLER',
      dutyEnd: Boolean(body.dutyEnd),
    });

    return NextResponse.json({
      ...result,
      message: body.dutyEnd
        ? '🎉 Duty shift ended and data backup secured to Google Drive!'
        : '🎉 CRM Data Backup created and secured to Google Drive!',
    });
  } catch (error: any) {
    console.error('Backup API Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Backup failed' },
      { status: 500 }
    );
  }
}
