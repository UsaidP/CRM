'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Film, Image as ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react';

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
  helpText = 'Upload sharp property photos, plot plans, and walkthrough videos. Images up to 25 MB; videos up to 250 MB.',
  maxItems = 12,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    if (value.length + files.length > maxItems) {
      setError(`Keep up to ${maxItems} media items per record.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const response = await fetch('/api/v1/inventory/media', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Media upload failed.');
      onChange([...value, ...(data.data as MediaAsset[])]);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Media upload failed. Try a smaller file or another format.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateAsset = (id: string, patch: Partial<MediaAsset>) => {
    onChange(value.map((asset) => asset.id === id ? { ...asset, ...patch } : asset));
  };

  const moveAsset = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <section className="space-y-2.5 rounded-xl border border-[#b59658]/20 bg-[#12151f] p-3" aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-white"><UploadCloud className="h-3.5 w-3.5 text-[#ccb67b]" />{label}</h3>
          <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-slate-400">{helpText}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-[#ccb67b]">{value.length}/{maxItems}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
        multiple
        className="sr-only"
        onChange={(event) => uploadFiles(Array.from(event.target.files || []))}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || value.length >= maxItems}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#b59658]/40 bg-[#1b202c] px-3 py-2 text-xs font-semibold text-[#ccb67b] transition hover:border-[#ccb67b] hover:bg-[#2a3040] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {uploading ? 'Uploading media…' : 'Choose images or videos'}
      </button>

      {error && <p role="alert" className="rounded-md border border-red-500/40 bg-red-950/40 px-2.5 py-2 text-[10px] text-red-200">{error}</p>}

      {value.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {value.map((asset, index) => (
            <article key={asset.id} className="rounded-lg border border-[#b59658]/15 bg-[#1b202c] p-2">
              <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-slate-950">
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
                <input aria-label={`${asset.kind} title`} value={asset.title || ''} onChange={(event) => updateAsset(asset.id, { title: event.target.value })} placeholder="Media title" className="min-w-0 rounded border border-[#b59658]/20 bg-[#12151f] px-2 py-1.5 text-[10px] text-white placeholder-slate-500" />
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveAsset(index, -1)} disabled={index === 0} aria-label="Move media earlier" className="grid h-8 w-8 place-items-center rounded border border-[#b59658]/20 text-slate-300 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveAsset(index, 1)} disabled={index === value.length - 1} aria-label="Move media later" className="grid h-8 w-8 place-items-center rounded border border-[#b59658]/20 text-slate-300 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => onChange(value.filter((item) => item.id !== asset.id))} aria-label="Remove media" className="grid h-8 w-8 place-items-center rounded border border-red-500/30 text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <input aria-label={`${asset.kind} alt text`} value={asset.alt || ''} onChange={(event) => updateAsset(asset.id, { alt: event.target.value })} placeholder="Accessibility alt text" className="mt-2 w-full rounded border border-[#b59658]/20 bg-[#12151f] px-2 py-1.5 text-[10px] text-white placeholder-slate-500" />
              <input aria-label={`${asset.kind} caption`} value={asset.caption || ''} onChange={(event) => updateAsset(asset.id, { caption: event.target.value })} placeholder="Optional client caption" className="mt-2 w-full rounded border border-[#b59658]/20 bg-[#12151f] px-2 py-1.5 text-[10px] text-white placeholder-slate-500" />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
