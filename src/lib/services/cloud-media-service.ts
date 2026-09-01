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
 * Generate signed upload parameters for direct client-to-Cloudinary uploads
 * Allows browser to upload large files (e.g. 10MB - 100MB) directly to CDN,
 * completely bypassing Vercel's 4.5MB Serverless Function payload limit.
 */
export function generateCloudinaryUploadSignature(
  category: MediaCategory = 'general',
  fileName = 'upload',
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
) {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `zamzam_crm/${category}`;
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `${baseName}_${Date.now()}`;

  // Signature string: folder=...&public_id=...&timestamp=...<api_secret>
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  return {
    signature,
    timestamp,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
    folder,
    publicId,
    resourceType,
  };
}

/**
 * Upload a media buffer directly to Cloudinary using chunked upload stream
 * Supports files up to 100MB+ (heavy brochures, PDFs, 4K walkthroughs)
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
  const folder = `zamzam_crm/${category}`;
  const baseName = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '_');
  const publicId = `${baseName}_${Date.now()}`;

  const isVideo = mimeType.startsWith('video/') || fileName.match(/\.(mp4|mov|webm)$/i);
  const isRaw = mimeType.includes('pdf') || fileName.match(/\.(pdf|doc|docx|zip)$/i);
  const resourceType = isVideo ? 'video' : isRaw ? 'raw' : 'image';

  return new Promise<UploadedMediaAsset>((resolve, reject) => {
    const uploadOptions = {
      folder,
      public_id: publicId,
      resource_type: resourceType as any,
      chunk_size: 6000000, // 6 MB chunks for large file support
    };

    const handleResult = (error: any, result: any) => {
      if (error || !result) {
        reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown upload failure'}`));
        return;
      }

      resolve({
        url: result.secure_url || result.url,
        secureUrl: result.secure_url || result.url,
        publicId: result.public_id || publicId,
        storageProvider: 'CLOUDINARY',
        fileName,
        fileSizeBytes: result.bytes || nodeBuffer.length,
        mimeType,
        category,
        width: result.width,
        height: result.height,
        format: result.format || path.extname(fileName).replace('.', '') || (isRaw ? 'pdf' : 'jpg'),
        createdAt: result.created_at || new Date().toISOString(),
      });
    };

    // Use upload_large_stream for files > 5MB to stream in chunks
    const uploadStream = nodeBuffer.length > 5 * 1024 * 1024
      ? cloudinary.uploader.upload_large_stream(uploadOptions, handleResult)
      : cloudinary.uploader.upload_stream(uploadOptions, handleResult);

    uploadStream.end(nodeBuffer);
  });
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
  const ext = path.extname(fileName) || (mimeType.includes('pdf') ? '.pdf' : '.jpg');
  const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueFileName = `${baseName}_${Date.now()}${ext}`;

  try {
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
  } catch (fsErr: any) {
    console.warn(`[MEDIA] Direct public/uploads write failed (${fsErr.message})`);
  }

  // Fallback data URI
  const dataUrl = `data:${mimeType};base64,${nodeBuffer.toString('base64')}`;

  return {
    url: dataUrl,
    secureUrl: dataUrl,
    publicId: `data_${category}_${uniqueFileName}`,
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
 * Tries Cloudinary CDN first, with seamless fallback to Local Vault if Cloudinary limits or errors are encountered.
 */
export async function uploadMediaAsset(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  fileName: string,
  category: MediaCategory = 'general',
  mimeType = 'image/jpeg'
): Promise<UploadedMediaAsset> {
  if (isCloudinaryConfigured()) {
    try {
      return await uploadToCloudinary(buffer, fileName, category, mimeType);
    } catch (err: any) {
      console.warn(`[MEDIA] Cloudinary upload notice (${err.message}). Storing in local media vault.`);
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
