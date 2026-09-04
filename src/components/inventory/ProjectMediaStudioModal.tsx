'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Layers,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Eye,
  Film,
  Compass,
  Check,
  RefreshCw,
  Zap,
  Cloud,
  HardDrive,
  Download,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { HallmarkStamp } from '@/components/ui/HallmarkStamp';
import { FeedbackAlert } from '@/components/ui/FeedbackAlert';
import { resolveAssetUrl, parseGalleryUrls } from '@/lib/inventory-media';
import { resolveUnitMediaAssets } from '@/lib/domain/unit-differentiation';

export interface ProjectMediaStudioModalProps {
  open: boolean;
  onClose: () => void;
  project: any;
  onUpdated: () => void;
}

export function ProjectMediaStudioModal({
  open,
  onClose,
  project,
  onUpdated,
}: ProjectMediaStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'extract' | 'elevations' | 'floorplans' | 'videos'>('extract');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<any | null>(null);
  const [extractedResult, setExtractedResult] = useState<any | null>(null);

  // Elevation Gallery State
  const [coverImage, setCoverImage] = useState<string>(project?.coverImageUrl || '');
  const [elevationGallery, setElevationGallery] = useState<string[]>(() => {
    const elevUrls = parseGalleryUrls(project?.elevationImagesJson);
    const urls = elevUrls.length > 0 ? elevUrls : parseGalleryUrls(project?.mediaGalleryJson);
    if (project?.coverImageUrl && !urls.includes(project.coverImageUrl)) {
      urls.unshift(project.coverImageUrl);
    }
    return urls;
  });

  // Selected Unit for Floor Plan & Photos
  const units = project?.units || [];
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');
  const selectedUnit = units.find((u: any) => u.id === selectedUnitId) || units[0];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<'elevations' | 'floor-plans' | 'unit-photos' | 'brochures' | 'videos'>('elevations');

  // Preview Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchStorageStatus();
      setCoverImage(project?.coverImageUrl || '');
      const elevUrls = parseGalleryUrls(project?.elevationImagesJson);
      const urls = elevUrls.length > 0 ? elevUrls : parseGalleryUrls(project?.mediaGalleryJson);
      if (project?.coverImageUrl && !urls.includes(project.coverImageUrl)) {
        urls.unshift(project.coverImageUrl);
      }
      setElevationGallery(urls);
      if (units.length > 0 && !selectedUnitId) {
        setSelectedUnitId(units[0].id);
      }
    }
  }, [open, project]);

  async function fetchStorageStatus() {
    try {
      const res = await fetch('/api/v1/media/status');
      if (res.ok) {
        const data = await res.json();
        setStorageStatus(data);
      }
    } catch (e) {
      console.warn('Failed to fetch storage status:', e);
    }
  }

  async function handleExtractFromBrochure(brochureFile?: File) {
    if (!project?.id) return;
    setExtracting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('projectId', project.id);
      if (brochureFile) {
        formData.append('brochure', brochureFile);
      }

      const res = await fetch('/api/v1/media/extract-brochure', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract brochure assets.');
      }

      setExtractedResult(data.result);
      setSuccessMessage(data.message || 'Successfully extracted elevations and floor plans from brochure!');
      if (data.result?.elevations?.length > 0) {
        const firstElev = resolveAssetUrl(data.result.elevations[0]);
        setCoverImage(firstElev);
        setElevationGallery(data.result.elevations.map(resolveAssetUrl));
      }
      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Brochure extraction failed.');
    } finally {
      setExtracting(false);
    }
  }

  async function handleFileUpload(fileInput: File | FileList | File[], category: 'elevations' | 'floor-plans' | 'unit-photos' | 'brochures' | 'videos') {
    if (!project?.id) return;
    const files = fileInput instanceof File ? [fileInput] : Array.from(fileInput);
    if (files.length === 0) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category === 'unit-photos' ? 'interior' : category);
        formData.append('projectId', project.id);

        if (category === 'elevations') {
          if (i === 0 && !coverImage) formData.append('isCover', 'true');
        } else if (category === 'floor-plans' && selectedUnitId) {
          formData.append('unitId', selectedUnitId);
          formData.append('isFloorPlan', 'true');
        } else if (category === 'unit-photos' && selectedUnitId) {
          formData.append('unitId', selectedUnitId);
        }

        const res = await fetch('/api/v1/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }

        const url = resolveAssetUrl(data.asset);
        if (url) uploadedUrls.push(url);
      }

      if (category === 'elevations') {
        if (!coverImage && uploadedUrls.length > 0) {
          setCoverImage(uploadedUrls[0]);
        }
        setElevationGallery((prev) => [...uploadedUrls, ...prev]);
        setSuccessMessage(`Successfully uploaded ${uploadedUrls.length} photo(s) to cloud media vault!`);
      } else if (category === 'floor-plans') {
        setSuccessMessage(`Floor plan blueprint(s) uploaded and linked to Flat ${selectedUnit?.unitNumber || selectedUnit?.bhk + ' BHK'}!`);
      } else if (category === 'unit-photos') {
        setSuccessMessage(`Uploaded ${uploadedUrls.length} interior photo(s) and linked to Flat ${selectedUnit?.unitNumber || selectedUnit?.bhk + ' BHK'}!`);
      } else if (category === 'videos') {
        setSuccessMessage(`Walkthrough video uploaded to cloud vault!`);
      }

      onUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      titleId="media-studio-title"
      size="2xl"
    >
      <div className="flex flex-col gap-6 p-6">
        {/* Header Ribbon & Storage Provider Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-surface-elevated/40 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-inner">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="media-studio-title" className="text-lg font-bold text-content tracking-tight">
                  {project?.projectName} — Elevation &amp; Floor Plan Studio
                </h2>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent border border-accent/20">
                  {project?.microMarket}
                </span>
              </div>
              <p className="text-xs text-content-muted">
                Developer: <strong className="text-content">{project?.developerName}</strong> • MahaRERA: <span className="font-mono text-accent-text">{project?.reraNumber}</span>
              </p>
            </div>
          </div>

          {/* Storage Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 shadow-sm">
              {storageStatus?.activeProvider === 'CLOUDINARY' ? (
                <>
                  <Cloud className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-semibold text-sky-300">Cloudinary CDN Active</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </>
              ) : (
                <>
                  <HardDrive className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">Local Media Vault Active</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </>
              )}
            </div>
            <HallmarkStamp className="scale-90" />
          </div>
        </div>

        {/* Studio Tabs */}
        <div className="flex border-b border-border/60">
          <button
            onClick={() => setActiveTab('extract')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === 'extract'
                ? 'border-accent text-accent'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Brochure AI Extractor
          </button>
          <button
            onClick={() => setActiveTab('elevations')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === 'elevations'
                ? 'border-accent text-accent'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Elevation Renders ({elevationGallery.length})
          </button>
          <button
            onClick={() => setActiveTab('floorplans')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === 'floorplans'
                ? 'border-accent text-accent'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Layers className="h-4 w-4" />
            Floor Plan Blueprints ({units.length} Units)
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
              activeTab === 'videos'
                ? 'border-accent text-accent'
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Film className="h-4 w-4" />
            Walkthrough Videos &amp; Reels
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept={
            uploadCategory === 'videos'
              ? 'video/mp4,video/webm,video/quicktime'
              : uploadCategory === 'brochures'
              ? 'application/pdf,image/*'
              : 'image/jpeg,image/png,image/webp,image/svg+xml'
          }
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFileUpload(e.target.files, uploadCategory);
            }
          }}
        />

        {/* TAB 1: BROCHURE AI EXTRACTOR */}
        {activeTab === 'extract' && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-content">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    Extract Elevation &amp; Floor Plans from Project Brochure
                  </h3>
                  <p className="mt-1 text-xs text-content-muted max-w-2xl leading-relaxed">
                    Upload the official developer brochure PDF or architectural scan. The engine analyzes statutory building dimensions, floor rise blueprints, and high-rise elevations, automatically optimizing and storing them on Cloudinary / Local Media Vault.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={extracting}
                  onClick={() => handleExtractFromBrochure()}
                  className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-contrast shadow-lg hover:bg-accent/90 disabled:opacity-50 transition-all"
                >
                  {extracting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Extracting Media...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Auto-Extract All Assets Now
                    </>
                  )}
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => {
                  setUploadCategory('brochures');
                  fileInputRef.current?.click();
                }}
                className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-surface-elevated/20 p-8 text-center transition-all hover:border-accent/60 hover:bg-surface-elevated/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-content">
                  Drop Developer Brochure PDF here, or click to browse
                </h4>
                <p className="mt-1 text-xs text-content-muted">
                  Supports statutory PDFs, high-res elevation blueprints, and unit floor plan scans (Up to 100 MB)
                </p>
              </div>
            </div>

            {/* Extracted Results Preview */}
            {extractedResult && (
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-bold text-content flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Extracted Media Package ({extractedResult.elevations.length} Elevations, {extractedResult.floorPlans.length} Floor Plans)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Elevations Preview */}
                  {extractedResult.elevations.map((elev: any, idx: number) => {
                    const imgUrl = resolveAssetUrl(elev);
                    return (
                      <div key={idx} className="group relative rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
                        <div className="relative h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                          <img
                            src={imgUrl}
                            alt={elev.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                          <button
                            onClick={() => setLightboxUrl(imgUrl)}
                            className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/90"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                          <span className="absolute bottom-2 left-2 rounded-md bg-accent/90 px-2 py-0.5 text-[10px] font-bold text-accent-contrast">
                            {elev.viewAngle}
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-content">{elev.title}</p>
                          <p className="text-[11px] text-content-muted line-clamp-2 mt-1">{elev.description}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Floor Plans Preview */}
                  {extractedResult.floorPlans.map((fp: any, idx: number) => {
                    const imgUrl = resolveAssetUrl(fp);
                    return (
                      <div key={idx} className="group relative rounded-xl border border-sky-500/30 bg-surface overflow-hidden shadow-sm">
                        <div className="relative h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                          <img
                            src={imgUrl}
                            alt={fp.title}
                            className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                          />
                          <button
                            onClick={() => setLightboxUrl(imgUrl)}
                            className="absolute top-2 right-2 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black/90"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                          <span className="absolute bottom-2 left-2 rounded-md bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                            {fp.bhk} BHK • {fp.carpetAreaSqft} Sq.Ft
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-bold text-content">{fp.title}</p>
                          <p className="text-[11px] text-content-muted line-clamp-2 mt-1">{fp.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ELEVATIONS GALLERY */}
        {activeTab === 'elevations' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-content">Project Elevation Renders &amp; Facade Photos</h3>
                <p className="text-xs text-content-muted">
                  High-definition architectural views, podium landscape shots, and entrance lobby renders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadCategory('elevations');
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-contrast hover:bg-accent/90 cursor-pointer shadow-sm"
              >
                <UploadCloud className="h-4 w-4" />
                Add Photos (Select Multiple)
              </button>
            </div>

            {/* Primary Cover Image Preview */}
            <div className="relative rounded-2xl border border-accent/40 bg-surface overflow-hidden shadow-md">
              <div className="relative h-72 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="Project Main Elevation"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-content-muted">
                    <ImageIcon className="h-10 w-10 opacity-40" />
                    <span className="text-xs">No elevation cover image set yet.</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <div className="absolute top-3 left-3 rounded-md bg-accent px-3 py-1 text-xs font-bold text-accent-contrast shadow">
                  PRIMARY ELEVATION COVER
                </div>
                {coverImage && (
                  <button
                    onClick={() => setLightboxUrl(coverImage)}
                    className="absolute top-3 right-3 rounded-lg bg-black/60 p-2 text-white hover:bg-black/90"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white">{project?.projectName} Elevation View</h4>
                    <p className="text-xs text-slate-300">
                      {project?.totalFloors} Storeys • {project?.microMarket}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Elevation Gallery Grid */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-content-muted uppercase tracking-wider">
                All Elevation &amp; Facade Angles ({elevationGallery.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {elevationGallery.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className={`group relative rounded-xl border overflow-hidden cursor-pointer ${
                      coverImage === imgUrl ? 'border-accent ring-2 ring-accent/50' : 'border-border'
                    }`}
                  >
                    <div className="relative h-32 w-full bg-slate-950">
                      <img src={imgUrl} alt={`Elevation ${idx + 1}`} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => setLightboxUrl(imgUrl)}
                          className="rounded-lg bg-black/80 p-1.5 text-white hover:bg-black"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCoverImage(imgUrl)}
                          className="rounded-lg bg-accent p-1.5 text-accent-contrast hover:bg-accent/90"
                          title="Set as Main Cover"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FLOOR PLANS STUDIO */}
        {activeTab === 'floorplans' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-content">Architectural Floor Plan Blueprints</h3>
                <p className="text-xs text-content-muted">
                  Interactive room dimensions, RERA carpet layout diagrams, and balcony orientations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadCategory('floor-plans');
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-contrast hover:bg-accent/90 cursor-pointer shadow-sm"
              >
                <UploadCloud className="h-4 w-4" />
                Add Floor Plans (Select Multiple)
              </button>
            </div>

            {/* Unit Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {units.map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUnitId(u.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    selectedUnit?.id === u.id
                      ? 'bg-accent text-accent-contrast shadow-md'
                      : 'border border-border bg-surface text-content hover:border-accent/40'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Unit {u.unitNumber || `${u.bhk} BHK`} ({u.carpetAreaSqft} Sq.Ft)
                  {u.floorPlanUrl && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Selected Unit Floor Plan Showcase */}
            {selectedUnit && (
              <div className="rounded-2xl border border-sky-500/30 bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h4 className="text-base font-bold text-content">
                      Unit {selectedUnit.unitNumber || `${selectedUnit.bhk} BHK`} Floor Plan Layout
                    </h4>
                    <p className="text-xs text-content-muted">
                      {selectedUnit.bhk} BHK • {selectedUnit.carpetAreaSqft} Sq.Ft RERA Carpet • Facing {selectedUnit.facing}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent-text">
                      ₹{(selectedUnit.allInTotalCost / 100000).toFixed(2)} Lakhs All-In
                    </span>
                  </div>
                </div>

                <div className="mt-4 relative h-96 w-full rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-border">
                  {selectedUnit.floorPlanUrl ? (
                    <img
                      src={selectedUnit.floorPlanUrl}
                      alt={`Floor plan for Unit ${selectedUnit.unitNumber}`}
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-content-muted">
                      <Layers className="h-10 w-10 opacity-30" />
                      <span className="text-xs">No floor plan attached to this unit yet.</span>
                      <button
                        onClick={() => handleExtractFromBrochure()}
                        className="mt-2 text-xs font-bold text-accent hover:underline"
                      >
                        Auto-generate from brochure
                      </button>
                    </div>
                  )}

                  {selectedUnit.floorPlanUrl && (
                    <button
                      onClick={() => setLightboxUrl(selectedUnit.floorPlanUrl)}
                      className="absolute top-3 right-3 rounded-lg bg-black/60 p-2 text-white hover:bg-black/90 shadow"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Unit Interior Photos Showcase */}
                {(() => {
                  const unitMedia = resolveUnitMediaAssets(selectedUnit);
                  return (
                    <div className="mt-5 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-accent" />
                            Unit Interior Photos ({unitMedia.photos.length})
                          </h5>
                          <p className="text-[11px] text-content-muted mt-0.5">
                            Photos uploaded specifically for Flat {selectedUnit.unitNumber || selectedUnit.bhk + ' BHK'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadCategory('unit-photos');
                            fileInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-xs font-semibold text-content flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-accent" />
                          <span>Add Photos for this Flat</span>
                        </button>
                      </div>

                      {unitMedia.photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {unitMedia.photos.map((photoUrl, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-lg border border-border overflow-hidden aspect-4/3 cursor-pointer bg-slate-950"
                              onClick={() => setLightboxUrl(photoUrl)}
                            >
                              <img
                                src={photoUrl}
                                alt={`Unit ${selectedUnit.unitNumber} Photo ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-content-muted italic">
                          No interior photos uploaded for Flat {selectedUnit.unitNumber || selectedUnit.bhk + ' BHK'} yet. Click &quot;Add Photos for this Flat&quot; above to upload.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VIDEOS & REELS */}
        {activeTab === 'videos' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-content">Walkthrough Videos &amp; Short Video Reels</h3>
                <p className="text-xs text-content-muted">
                  High-converting 4K sample flat tours, drone aerial surveys, and social reels.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadCategory('videos');
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-contrast hover:bg-accent/90"
              >
                <UploadCloud className="h-4 w-4" />
                Upload Project Video
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project?.youtubeWalkthroughUrl ? (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h4 className="text-xs font-bold text-content mb-2 flex items-center gap-2">
                    <Film className="h-4 w-4 text-red-500" />
                    YouTube Walkthrough Tour
                  </h4>
                  <a
                    href={project.youtubeWalkthroughUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated/40 p-3 text-xs text-accent hover:underline"
                  >
                    <span>{project.youtubeWalkthroughUrl}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-6 text-center text-xs text-content-muted">
                  <Film className="h-8 w-8 mx-auto mb-2 opacity-30 text-accent" />
                  No video walkthrough linked yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
            <img src={lightboxUrl} alt="Zoomed View" className="h-full w-full object-contain" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 rounded-full bg-black/80 p-2 text-white hover:bg-black"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </AccessibleDialog>
  );
}
