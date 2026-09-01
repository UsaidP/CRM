import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

export { cloudinary };

export type MediaCategory = 'elevations' | 'floor-plans' | 'brochures' | 'videos' | 'gallery' | 'general' | 'rera-certificates';

export interface UploadedMediaAsset {
  url: string;
  secureUrl: string;
  publicId: string;
  storageProvider: 'CLOUDINARY' | 'LOCAL';
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  category: MediaCategory;
  width?: number;
  height?: number;
  format: string;
  createdAt: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Reads Cloudinary credentials from environment variables and initializes SDK
 */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return { cloudName, apiKey, apiSecret };
  }

  const cloudinaryUrl = process.env.CLOUDINARY_URL || '';
  if (cloudinaryUrl && cloudinaryUrl.startsWith('cloudinary://')) {
    try {
      const parsed = new URL(cloudinaryUrl);
      const [key, secret] = parsed.username ? [parsed.username, parsed.password] : parsed.pathname.split(':');
      const name = parsed.hostname;
      if (name && key && secret) {
        cloudinary.config({
          cloud_name: name,
          api_key: key,
          api_secret: secret,
          secure: true,
        });
        return { cloudName: name, apiKey: key, apiSecret: secret };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

/**
 * Upload a media buffer directly to Cloudinary using standard REST API with HMAC signature
 */
export async function uploadToCloudinary(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  category: MediaCategory = 'general',
  mimeType = 'image/jpeg'
): Promise<UploadedMediaAsset> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error('Cloudinary is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET in environment.');
  }

  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `zamzam_crm/${category}`;
  const baseName = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `${baseName}_${Date.now()}`;

  const isVideo = mimeType.startsWith('video/');
  const isRaw = mimeType === 'application/pdf' || mimeType.includes('pdf');
  const resourceType = isVideo ? 'video' : isRaw ? 'raw' : 'image';

  // Generate SHA-1 signature: folder=...&public_id=...&timestamp=...<api_secret>
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  // Form Data Payload
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(nodeBuffer)], { type: mimeType });
  formData.append('file', blob, fileName);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`Cloudinary upload failed: ${data.error?.message || response.statusText}`);
  }

  return {
    url: data.url || data.secure_url,
    secureUrl: data.secure_url || data.url,
    publicId: data.public_id || publicId,
    storageProvider: 'CLOUDINARY',
    fileName,
    fileSizeBytes: data.bytes || nodeBuffer.length,
    mimeType,
    category,
    width: data.width,
    height: data.height,
    format: data.format || path.extname(fileName).replace('.', '') || 'jpg',
    createdAt: data.created_at || new Date().toISOString(),
  };
}

/**
 * Upload a media buffer to Local Disk Storage (/public/uploads/[category]/)
 */
export async function uploadToLocalStorage(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  category: MediaCategory = 'general',
  mimeType = 'image/jpeg'
): Promise<UploadedMediaAsset> {
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  
  const ext = path.extname(fileName) || (mimeType === 'application/pdf' ? '.pdf' : mimeType.startsWith('video/') ? '.mp4' : '.jpg');
  const safeName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueFileName = `${safeName}_${crypto.randomUUID().slice(0, 8)}${ext}`;

  // Try standard local public/uploads directory first (works on standard Node / local dev)
  try {
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (!isServerless) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', category);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, nodeBuffer);

      const publicUrl = `/uploads/${category}/${uniqueFileName}`;

      return {
        url: publicUrl,
        secureUrl: publicUrl,
        publicId: `local_${category}_${uniqueFileName}`,
        storageProvider: 'LOCAL',
        fileName,
        fileSizeBytes: nodeBuffer.length,
        mimeType,
        category,
        format: ext.replace('.', ''),
        createdAt: new Date().toISOString(),
      };
    }
  } catch (fsErr: any) {
    console.warn(`[MEDIA] Direct public/uploads write failed (${fsErr.message}), falling back to serverless data URI & /tmp`);
  }

  // Fallback for Vercel / AWS Lambda / Serverless read-only filesystem
  try {
    const tmpUploadDir = path.join('/tmp', 'uploads', category);
    if (!fs.existsSync(tmpUploadDir)) {
      fs.mkdirSync(tmpUploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(tmpUploadDir, uniqueFileName), nodeBuffer);
  } catch {
    // ignore /tmp errors
  }

  // Generate valid Data URL for browser rendering
  let dataUrl: string;
  if (mimeType === 'image/svg+xml') {
    dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(nodeBuffer.toString('utf-8'))}`;
  } else {
    dataUrl = `data:${mimeType};base64,${nodeBuffer.toString('base64')}`;
  }

  return {
    url: dataUrl,
    secureUrl: dataUrl,
    publicId: `serverless_${category}_${uniqueFileName}`,
    storageProvider: 'LOCAL',
    fileName,
    fileSizeBytes: nodeBuffer.length,
    mimeType,
    category,
    format: ext.replace('.', ''),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Universal Media Uploader
 * Automatically routes to Cloudinary if configured; otherwise gracefully saves to local disk storage
 */
export async function uploadMediaAsset(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  category: MediaCategory = 'general',
  mimeType = 'image/jpeg',
  forceLocal = false
): Promise<UploadedMediaAsset> {
  if (!forceLocal && isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(buffer, fileName, category, mimeType);
    } catch (cloudErr: any) {
      console.warn(`[MEDIA] Cloudinary upload failed, falling back to local storage: ${cloudErr.message}`);
      return await uploadToLocalStorage(buffer, fileName, category, mimeType);
    }
  }

  return await uploadToLocalStorage(buffer, fileName, category, mimeType);
}

/**
 * Generate responsive / optimized Cloudinary CDN URL with transformations
 */
export function getOptimizedImageUrl(
  rawUrl?: string | null,
  options?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'limit' | 'thumb';
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'png' | 'jpg';
  }
): string {
  if (!rawUrl) return '/images/projects/placeholder-property.jpg';

  // If it's a Cloudinary URL, inject transformations
  if (rawUrl.includes('res.cloudinary.com')) {
    const parts = rawUrl.split('/upload/');
    if (parts.length === 2) {
      const transforms: string[] = ['f_auto', 'q_auto'];
      if (options?.width) transforms.push(`w_${options.width}`);
      if (options?.height) transforms.push(`h_${options.height}`);
      if (options?.crop) transforms.push(`c_${options.crop}`);
      return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
    }
  }

  return rawUrl;
}
