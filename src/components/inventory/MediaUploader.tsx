'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Film, Image as ImageIcon, Loader2, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { compressImageFile, isCompressibleImage, formatBytes } from '@/lib/client/image-compressor';

export interface MediaAsset {
  id: string;
  url: string;
  kind: 'image' | 'video';
  title?: string;
  alt?: string;
  caption?: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

interface MediaUploaderProps {
  value: MediaAsset[];
  onChange: (assets: MediaAsset[]) => void;
  label?: string;
  helpText?: string;
  maxItems?: number;
}

export function MediaUploader({
  value,
  onChange,
  label = 'Property media',
  helpText = 'High-resolution photos are automatically optimized before uploading. Supports JPEG, PNG, WebP, AVIF, HEIC, and walkthrough videos (MP4, MOV, WebM).',
  maxItems = 12,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercent: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    if (value.length + files.length > maxItems) {
      setError(`Keep up to ${maxItems} media items per record. You tried to add ${files.length}, but can only add ${Math.max(0, maxItems - value.length)} more.`);
      return;
    }
    setError(null);
    setUploading(true);
    setCompressing(true);

    try {
      let totalOriginalBytes = 0;
      let totalCompressedBytes = 0;

      // Compress all compressible image files on the client before network transmission
      const processedFiles: File[] = [];
      for (const file of files) {
        if (isCompressibleImage(file)) {
          totalOriginalBytes += file.size;
          try {
            const compressed = await compressImageFile(file, {
              maxWidth: 2048,
              maxHeight: 2048,
              quality: 0.82,
            });
            totalCompressedBytes += compressed.compressedBytes;
            processedFiles.push(compressed.file);
          } catch (compErr: any) {
            console.warn(`[COMPRESS_FALLBACK] Using original file for "${file.name}":`, compErr);
            totalCompressedBytes += file.size;
            processedFiles.push(file);
          }
        } else {
          processedFiles.push(file);
        }
      }

      setCompressing(false);

      if (totalOriginalBytes > 0 && totalCompressedBytes < totalOriginalBytes) {
        const savedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
        const savedPercent = Math.round((savedBytes / totalOriginalBytes) * 100);
        setCompressionStats({
          originalSize: totalOriginalBytes,
          compressedSize: totalCompressedBytes,
          savedPercent,
        });
      }

      const formData = new FormData();
      processedFiles.forEach((file) => formData.append('files', file));
      const response = await fetch('/api/v1/inventory/media', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Media upload failed.');
      }
      onChange([...value, ...(data.data as MediaAsset[])]);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Media upload failed. Try a smaller file or another format.');
    } finally {
      setUploading(false);
      setCompressing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateAsset = (index: number, patch: Partial<MediaAsset>) => {
    onChange(value.map((asset, i) => (i === index ? { ...asset, ...patch } : asset)));
  };

  const removeAsset = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveAsset = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <section className="space-y-2.5 rounded-xl border border-border bg-surface p-3" aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-content">
            <UploadCloud className="h-3.5 w-3.5 text-accent" />
            {label}
          </h3>
          <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-content-muted">{helpText}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-accent-text">{value.length}/{maxItems}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime,video/x-m4v"
        multiple
        className="sr-only"
        onChange={(event) => uploadFiles(Array.from(event.target.files || []))}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading && value.length < maxItems) {
            inputRef.current?.click();
          }
        }}
        className={`flex min-h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition ${
          isDragging
            ? 'border-accent bg-accent/10 scale-[1.01]'
            : 'border-accent/40 bg-surface-subtle hover:border-accent hover:bg-surface-raised'
        } ${uploading || value.length >= maxItems ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-text">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {compressing ? 'Optimizing & compressing images…' : 'Saving media to cloud vault…'}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-xs font-bold text-accent-text">
              <UploadCloud className="h-4 w-4 text-accent" />
              <span>Click to browse or drag &amp; drop photos and walkthrough videos</span>
            </div>
            <p className="text-[10px] text-content-muted">
              JPG, PNG, WebP, AVIF, HEIC, MP4, MOV, WebM • Photos up to 50 MB • Videos up to 300 MB
            </p>
          </>
        )}
      </div>

      {compressionStats && compressionStats.savedPercent > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-status-success/30 bg-status-success-surface px-3 py-2 text-[11px] text-status-success">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-status-success shrink-0" />
            <span>
              Compressed {formatBytes(compressionStats.originalSize)} ➔{' '}
              {formatBytes(compressionStats.compressedSize)}
            </span>
          </div>
          <span className="font-bold font-mono">
            {compressionStats.savedPercent}% Cloudinary space saved
          </span>
        </div>
      )}

      {error && (
        <FeedbackAlert
          variant="error"
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {value.map((asset, index) => {
            const assetKey = asset.id ? `${asset.id}-${index}` : `media-${index}-${asset.url || 'asset'}`;
            return (
              <article key={assetKey} className="rounded-lg border border-border bg-surface-subtle p-2">
                <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-surface-inset">
                  {asset.kind === 'video' ? (
                    <video src={asset.url} controls preload="metadata" className="h-full w-full object-cover" aria-label={asset.alt || asset.title || 'Property video'} />
                  ) : (
                    <img src={asset.url} alt={asset.alt || asset.title || 'Property media'} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
                    {asset.kind === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}{asset.kind}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <input aria-label={`${asset.kind} title`} value={asset.title || ''} onChange={(event) => updateAsset(index, { title: event.target.value })} placeholder="Media title" className="min-w-0 rounded border border-border bg-surface-inset px-2 py-1.5 text-[10px] text-content placeholder-content-muted" />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveAsset(index, -1)} disabled={index === 0} aria-label="Move media earlier" className="grid h-8 w-8 place-items-center rounded border border-border text-content-secondary disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moveAsset(index, 1)} disabled={index === value.length - 1} aria-label="Move media later" className="grid h-8 w-8 place-items-center rounded border border-border text-content-secondary disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => removeAsset(index)} aria-label="Remove media" className="grid h-8 w-8 place-items-center rounded border border-status-danger/30 text-status-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <input aria-label={`${asset.kind} alt text`} value={asset.alt || ''} onChange={(event) => updateAsset(index, { alt: event.target.value })} placeholder="Accessibility alt text" className="mt-2 w-full rounded border border-border bg-surface-inset px-2 py-1.5 text-[10px] text-content placeholder-content-muted" />
                <input aria-label={`${asset.kind} caption`} value={asset.caption || ''} onChange={(event) => updateAsset(index, { caption: event.target.value })} placeholder="Optional client caption" className="mt-2 w-full rounded border border-border bg-surface-inset px-2 py-1.5 text-[10px] text-content placeholder-content-muted" />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
