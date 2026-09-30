import { NextRequest, NextResponse } from 'next/server';
import { getCloudinaryConfig, cloudinary } from '@/lib/services/cloud-media-service';
import { requireSession } from '@/lib/services/api-auth';
import { handleApiError } from '@/lib/services/api-handler';

export const dynamic = 'force-dynamic';

/**
 * Returns a signed direct-to-cloud upload URL or local upload route
 * so physical SIM companion apps and the web CRM can upload audio files
 * without proxying heavy binaries through Vercel serverless functions.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession(req);
    // Allow either valid authenticated session OR companion app bearer token
    const authHeader = req.headers.get('authorization');
    const isCompanionToken = authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('Device '));

    if (!auth.ok && !isCompanionToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const config = getCloudinaryConfig();

    if (config && config.cloudName && config.apiKey && config.apiSecret) {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'zamzam-call-recordings';

      const signature = cloudinary.utils.api_sign_request(
        { folder, timestamp },
        config.apiSecret
      );

      return NextResponse.json({
        success: true,
        provider: 'CLOUDINARY',
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`,
        fields: {
          api_key: config.apiKey,
          timestamp,
          folder,
          signature,
        },
      });
    }

    // Local / development upload route
    return NextResponse.json({
      success: true,
      provider: 'LOCAL',
      uploadUrl: '/api/v1/calls/upload',
    });
  } catch (error) {
    return handleApiError(error, 'Failed to generate call upload ticket');
  }
}
