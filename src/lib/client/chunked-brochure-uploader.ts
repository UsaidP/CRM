/**
 * Client-Side Chunked Brochure Upload Engine
 * 
 * Slices large developer brochures (up to 50MB+) into 2.5MB slices that 
 * easily pass through Vercel's 4.5MB Serverless Function payload boundary.
 * Eliminates 413 "Request Entity Too Large" and Cloudinary 10MB free-tier limits.
 */

export interface ChunkedBrochureUploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  currentChunk: number;
  totalChunks: number;
  statusText: string;
}

export interface ChunkedBrochureUploadOptions {
  file: File;
  projectId?: string | null;
  signal?: AbortSignal;
  onProgress?: (progress: ChunkedBrochureUploadProgress) => void;
}

const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5 MB per chunk

export async function uploadBrochureChunked(
  options: ChunkedBrochureUploadOptions
): Promise<any> {
  const { file, projectId, signal, onProgress } = options;
  const totalBytes = file.size;
  const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
  const uploadId = `crm_up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let finalResponse: any = null;

  try {
    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) {
        throw new DOMException('Upload aborted by user', 'AbortError');
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', String(i));
      formData.append('totalChunks', String(totalChunks));
      formData.append('filename', file.name);
      formData.append('mimeType', file.type || 'application/pdf');
      if (projectId) {
        formData.append('projectId', projectId);
      }
      formData.append('chunk', chunkBlob, file.name);

      const isLastChunk = i === totalChunks - 1;
      const statusText = isLastChunk
        ? `Assembling brochure document & running AI Vision extraction...`
        : `Uploading document slice ${i + 1} of ${totalChunks} (${Math.round(((i + 1) / totalChunks) * 100)}%)...`;

      if (onProgress) {
        onProgress({
          uploadedBytes: end,
          totalBytes,
          percent: Math.round((end / totalBytes) * 100),
          currentChunk: i + 1,
          totalChunks,
          statusText,
        });
      }

      const res = await fetch('/api/v1/inventory/upload-chunk', {
        method: 'POST',
        body: formData,
        signal,
      });

      const rawText = await res.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned HTTP ${res.status}: ${rawText.slice(0, 150)}`);
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Upload failed on slice ${i + 1} of ${totalChunks}`);
      }

      if (json.completed) {
        finalResponse = json;
        break;
      }
    }

    if (!finalResponse) {
      throw new Error('Brochure upload completed all slices but extraction response was missing.');
    }

    return finalResponse;
  } catch (err: any) {
    // Attempt cleanup on error or abort
    try {
      fetch(`/api/v1/inventory/upload-chunk?uploadId=${encodeURIComponent(uploadId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch {}

    throw err;
  }
}
