import { NextResponse } from 'next/server';
import { isCloudinaryConfigured, getCloudinaryConfig } from '@/lib/services/cloud-media-service';
import { requireSession } from '@/lib/services/api-auth';

export async function GET(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const isCloudinary = isCloudinaryConfigured();
  const config = getCloudinaryConfig();

  return NextResponse.json({
    activeProvider: isCloudinary ? 'CLOUDINARY' : 'LOCAL',
    cloudinary: {
      isConfigured: isCloudinary,
      cloudName: config ? config.cloudName : null,
      apiKeyConfigured: !!(config?.apiKey),
      apiSecretConfigured: !!(config?.apiSecret),
    },
    local: {
      storagePath: '/public/uploads',
      isActive: true,
    },
    supportedCategories: [
      'elevations',
      'floor-plans',
      'brochures',
      'videos',
      'gallery',
      'general',
    ],
    features: [
      'High-Resolution Facade Elevation Extraction',
      '2D & 3D Architectural Blueprint Floor Plan Generation',
      'Cloudinary Dynamic Image Optimization (f_auto, q_auto)',
      'Direct Cloudinary Video Walkthrough & Reels Streaming',
      '1-Click PDF Brochure Asset Ingestion',
    ],
  });
}
