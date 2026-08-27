import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/services/api-auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) return auth.response;
    const { filename } = await params;

    // Security sanitization: prevent directory traversal
    const safeName = path.basename(filename);
    if (!safeName.startsWith('backup-zamzam-crm-') || !safeName.endsWith('.tar.gz')) {
      return NextResponse.json({ error: 'Invalid backup file name' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'backups', safeName);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup archive not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': stats.size.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to download file' },
      { status: 500 }
    );
  }
}
