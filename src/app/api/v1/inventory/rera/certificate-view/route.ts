import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/api-auth';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    const reraNumber = searchParams.get('rera');

    const cleanRera = reraNumber ? reraNumber.toUpperCase().trim().replace(/[^A-Z0-9]/gi, '') : null;
    const isStatutoryRera = cleanRera ? /^P\d{11}$/i.test(cleanRera) : false;

    const auth = await requireSession(req);
    if (!auth.ok && !isStatutoryRera) {
      return auth.response;
    }

    // 1. Check local original certificate images or PDFs first
    if (cleanRera) {
      const localPdf = path.join(process.cwd(), 'public', 'uploads', 'brochures', `MahaRERA_${cleanRera}_Certificate.pdf`);
      if (fs.existsSync(localPdf)) {
        const fileBuffer = fs.readFileSync(localPdf);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="MahaRERA_${cleanRera}_Certificate.pdf"`,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }

      const localPng = path.join(process.cwd(), 'public', 'images', 'original-certificates', `${cleanRera}.png`);
      if (fs.existsSync(localPng)) {
        const fileBuffer = fs.readFileSync(localPng);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `inline; filename="MahaRERA_${cleanRera}_Certificate.png"`,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }

    if (!targetUrl) {
      return NextResponse.json({ success: false, error: 'Target URL is required' }, { status: 400 });
    }

    // 2. Handle local relative paths
    if (targetUrl.startsWith('/') || targetUrl.startsWith('./')) {
      const sanitized = path.normalize(targetUrl).replace(/^(\.\.(\/|\\|$))+/, '');
      const localPath = path.join(process.cwd(), 'public', sanitized);
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/pdf';
        const fileBuffer = fs.readFileSync(localPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="${path.basename(localPath)}"`,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }

    // 3. Handle remote Cloudinary or Web URLs
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/pdf,image/*,*/*',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch remote certificate (HTTP ${response.status})` },
          { status: response.status }
        );
      }

      const arrayBuf = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf.slice(0, 10));
      const headerStr = String.fromCharCode(...bytes);
      
      // Determine content type by magic bytes
      let contentType = 'application/pdf';
      if (headerStr.startsWith('\x89PNG')) {
        contentType = 'image/png';
      } else if (headerStr.startsWith('\xFF\xD8\xFF')) {
        contentType = 'image/jpeg';
      } else if (headerStr.startsWith('%PDF')) {
        contentType = 'application/pdf';
      }

      const filename = `MahaRERA_${reraNumber || 'Certificate'}.${contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : 'pdf'}`;

      return new NextResponse(arrayBuf, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
  } catch (error: any) {
    console.error('Certificate view proxy error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
