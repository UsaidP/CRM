/**
 * Cloudinary Direct Chunked Upload Engine
 * Enables direct-to-Cloudinary uploading of large files (15MB - 100MB+ brochures, videos)
 * in 5MB slices, bypassing the 10MB single-request limit completely.
 */

export interface CloudinarySignedParams {
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export interface ChunkedUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
}

export interface CloudinaryUploadResponse {
  asset_id?: string;
  public_id: string;
  version?: number;
  format?: string;
  resource_type: string;
  created_at?: string;
  bytes: number;
  type?: string;
  url: string;
  secure_url: string;
  folder?: string;
  original_filename?: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk

/**
 * Uploads a large File to Cloudinary directly in chunked slices
 */
export async function uploadToCloudinaryChunked(
  file: File | Blob,
  signed: CloudinarySignedParams,
  fileName?: string,
  onProgress?: (progress: ChunkedUploadProgress) => void
): Promise<CloudinaryUploadResponse> {
  const totalSize = file.size;
  const resolvedFileName = fileName || (file instanceof File ? file.name : 'upload.pdf');
  const isVideo = file.type?.startsWith('video/') || resolvedFileName.match(/\.(mp4|mov|webm)$/i);
  const isRaw = file.type?.includes('pdf') || resolvedFileName.match(/\.(pdf|doc|docx|zip)$/i);
  const resourceType = signed.resourceType || (isVideo ? 'video' : isRaw ? 'raw' : 'auto');

  const endpoint = `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`;
  const uniqueUploadId = `crm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // If file is smaller than CHUNK_SIZE, send in one request
  if (totalSize <= CHUNK_SIZE) {
    const formData = new FormData();
    formData.append('file', file, resolvedFileName);
    formData.append('api_key', signed.apiKey);
    formData.append('timestamp', String(signed.timestamp));
    formData.append('signature', signed.signature);
    formData.append('folder', signed.folder);
    formData.append('public_id', signed.publicId);

    const res = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(`Cloudinary upload failed: ${json.error?.message || res.statusText}`);
    }

    if (onProgress) {
      onProgress({
        uploadedBytes: totalSize,
        totalBytes: totalSize,
        percent: 100,
        currentChunk: 1,
        totalChunks: 1,
      });
    }

    return json as CloudinaryUploadResponse;
  }

  // Multi-chunk upload
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  let finalResponse: CloudinaryUploadResponse | null = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunkBlob, resolvedFileName);
    formData.append('api_key', signed.apiKey);
    formData.append('timestamp', String(signed.timestamp));
    formData.append('signature', signed.signature);
    formData.append('folder', signed.folder);
    formData.append('public_id', signed.publicId);

    const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Unique-Upload-Id': uniqueUploadId,
        'Content-Range': contentRange,
      },
      body: formData,
    });

    const json = await res.json();

    if (!res.ok || json.error) {
      throw new Error(
        `Cloudinary chunked upload failed on chunk ${i + 1}/${totalChunks}: ${
          json.error?.message || res.statusText
        }`
      );
    }

    if (onProgress) {
      onProgress({
        uploadedBytes: end,
        totalBytes: totalSize,
        percent: Math.round((end / totalSize) * 100),
        currentChunk: i + 1,
        totalChunks,
      });
    }

    // The final chunk returns the completed Cloudinary asset object
    if (i === totalChunks - 1) {
      finalResponse = json as CloudinaryUploadResponse;
    }
  }

  if (!finalResponse) {
    throw new Error('Cloudinary chunked upload ended without a complete response.');
  }

  return finalResponse;
}
