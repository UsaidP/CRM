/**
 * Client-Side Image Compression Engine
 * Compresses and downsizes camera/listing images directly in the browser
 * before transmitting to Cloudinary. Saves 90%+ storage quota and bandwidth.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.82)
  targetMimeType?: 'image/webp' | 'image/jpeg';
  maxFileSizeBytes?: number; // Target max size if possible
}

export interface CompressedImageResult {
  file: File;
  blob: Blob;
  dataUrl?: string;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedPercent: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Checks whether a given file is a compressable image format
 */
export function isCompressibleImage(file: File | Blob): boolean {
  const type = file.type?.toLowerCase() || '';
  return (
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'image/webp' ||
    type === 'image/avif'
  );
}

/**
 * Calculates downscaled dimensions while strictly maintaining the original aspect ratio
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
    return { width: srcWidth, height: srcHeight };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * Formats byte size into human readable string (KB / MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses an image File or Blob in the browser using HTML5 Canvas.
 * - Resizes 4K/8K photos to optimal web resolution (default max 2048px)
 * - Re-encodes to high-efficiency WebP (or JPEG fallback)
 * - Retains crisp real estate visual quality while cutting 90%+ file weight
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.82,
    targetMimeType = 'image/webp',
  } = options;

  const originalBytes = file.size;

  // If not a compressible image (e.g. SVG or GIF), return original
  if (!isCompressibleImage(file)) {
    return {
      file,
      blob: file,
      originalBytes,
      compressedBytes: originalBytes,
      savedBytes: 0,
      savedPercent: 0,
      width: 0,
      height: 0,
      mimeType: file.type || 'application/octet-stream',
    };
  }

  // If running in non-browser environment (e.g. unit tests without DOM), return original
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      file,
      blob: file,
      originalBytes,
      compressedBytes: originalBytes,
      savedBytes: 0,
      savedPercent: 0,
      width: 0,
      height: 0,
      mimeType: file.type || 'image/jpeg',
    };
  }

  try {
    // Load image into an Image element
    const imageBitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to decode image file "${file.name}" for compression.`));
      };
      img.src = objectUrl;
    });

    const naturalWidth = imageBitmap.naturalWidth || imageBitmap.width || 0;
    const naturalHeight = imageBitmap.naturalHeight || imageBitmap.height || 0;

    const { width, height } = calculateAspectRatioFit(
      naturalWidth || maxWidth,
      naturalHeight || maxHeight,
      maxWidth,
      maxHeight
    );

    // Render to canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      // If Canvas 2D context is restricted (e.g. Brave shields / fingerprinting protection), fallback to original file
      console.warn(`[COMPRESSOR] Canvas 2D context unavailable for "${file.name}". Using original file.`);
      return {
        file,
        blob: file,
        originalBytes,
        compressedBytes: originalBytes,
        savedBytes: 0,
        savedPercent: 0,
        width: naturalWidth,
        height: naturalHeight,
        mimeType: file.type || 'image/jpeg',
      };
    }

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    // Convert canvas to blob
    const compressedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // If webp fails on older browser, fallback to jpeg
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) resolve(fallbackBlob);
                else reject(new Error('Canvas toBlob compression failed.'));
              },
              'image/jpeg',
              quality
            );
          }
        },
        targetMimeType,
        quality
      );
    });

    const compressedBytes = compressedBlob.size;
    const savedBytes = Math.max(0, originalBytes - compressedBytes);
    const savedPercent = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

    // Determine output filename with appropriate extension
    const extension = targetMimeType === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newFileName = `${baseName}${extension}`;

    const compressedFile = new File([compressedBlob], newFileName, {
      type: compressedBlob.type || targetMimeType,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      blob: compressedBlob,
      originalBytes,
      compressedBytes,
      savedBytes,
      savedPercent,
      width,
      height,
      mimeType: compressedBlob.type || targetMimeType,
    };
  } catch (err: any) {
    console.warn(`[COMPRESSOR] Client-side compression bypassed for "${file.name}":`, err?.message || err);
    return {
      file,
      blob: file,
      originalBytes,
      compressedBytes: originalBytes,
      savedBytes: 0,
      savedPercent: 0,
      width: 0,
      height: 0,
      mimeType: file.type || 'image/jpeg',
    };
  }
}
