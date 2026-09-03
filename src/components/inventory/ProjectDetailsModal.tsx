'use client';

import React, { useState, useRef } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  X, 
  Maximize2, 
  FileText, 
  Sparkles, 
  Phone, 
  Train, 
  ExternalLink, 
  ChevronRight, 
  Calculator,
  Pencil,
  Trash2,
  Download,
  FileCheck,
  RefreshCw,
  Eye,
  UploadCloud,
  ImagePlus,
  Loader2,
  Check,
  CheckCircle
} from 'lucide-react';
import { formatDateFull } from '@/lib/date-utils';
import { AccessibleDialog } from '@/components/ui/AccessibleDialog';
import { ReraVerificationBadge } from '@/components/inventory/ReraVerificationBadge';
import { MahaReraCertificateModal } from '@/components/inventory/MahaReraCertificateModal';
import { ProjectMediaStudioModal } from '@/components/inventory/ProjectMediaStudioModal';
import { resolveAssetUrl, parseGalleryUrls } from '@/lib/inventory-media';
import { uploadToCloudinaryChunked } from '@/lib/client/cloudinary-chunked-upload';

interface ProjectDetailsModalProps {
  project: any;
  unit?: any;
  units?: any[];
  onClose: () => void;
  onSelectUnitForCalc?: (unit: any) => void;
  onEditProject?: (project: any) => void;
  onDeleteProject?: (projectId: string, projectName: string) => void;
  onDeleteUnit?: (unit: any) => void;
  onEditUnit?: (unit: any) => void;
  onProjectUpdated?: (updatedProject?: any) => void;
}

export function ProjectDetailsModal({
  project,
  unit,
  units = [],
  onClose,
  onSelectUnitForCalc,
  onEditProject,
  onDeleteProject,
  onDeleteUnit,
  onEditUnit,
  onProjectUpdated,
}: ProjectDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'rera' | 'elevations' | 'floorplans' | 'areamatrix' | 'amenities'>(unit ? 'areamatrix' : 'rera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState(project);
  const [syncingCertificate, setSyncingCertificate] = useState(false);
  const [certificateMsg, setCertificateMsg] = useState<string | null>(null);
  const [showFormCModal, setShowFormCModal] = useState(false);
  const [showMediaStudio, setShowMediaStudio] = useState(false);

  // Multi-Photo & 1-Shot Extract State
  const elevationInputRef = useRef<HTMLInputElement>(null);
  const floorplanInputRef = useRef<HTMLInputElement>(null);
  const brochureExtractInputRef = useRef<HTMLInputElement>(null);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [oneShotExtracting, setOneShotExtracting] = useState(false);
  const [oneShotExtractMsg, setOneShotExtractMsg] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [deletingImageUrl, setDeletingImageUrl] = useState<string | null>(null);

  const handleSyncCertificate = async () => {
    if (!currentProject?.reraNumber) return;
    setSyncingCertificate(true);
    setCertificateMsg(null);
    try {
      const res = await fetch('/api/v1/inventory/rera/fetch-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reraNumber: currentProject.reraNumber,
          projectName: currentProject.projectName,
          developerName: currentProject.developerName,
          projectId: currentProject.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentProject((prev: any) => ({
          ...prev,
          reraCertificateUrl: data.data.certificateUrl,
          reraRegisteredName: data.data.projectRecord?.projectName,
          reraProjectStatus: data.data.projectRecord?.projectStatus,
          reraValidUntil: data.data.projectRecord?.validUntil,
        }));
        setCertificateMsg(`MahaRERA Certificate downloaded and linked to ${currentProject.projectName}!`);
        setTimeout(() => setCertificateMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Certificate sync error:', err);
    } finally {
      setSyncingCertificate(false);
    }
  };

  const handleMultiImageUpload = async (files: FileList | File[], category: 'elevations' | 'floorplans') => {
    const fileArray = Array.from(files);
    if (!fileArray.length || !currentProject?.id) return;

    setUploadingFiles(true);
    setUploadProgressMsg(`Uploading ${fileArray.length} image(s) to Cloud Media Vault...`);

    try {
      const uploadedUrls: string[] = [];

      // Concurrently upload files to cloud media vault
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category === 'floorplans' ? 'floor-plans' : 'elevations');
        formData.append('projectId', currentProject.id);

        const res = await fetch('/api/v1/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.asset) {
          return resolveAssetUrl(data.asset);
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      results.filter(Boolean).forEach((url) => uploadedUrls.push(url as string));

      if (uploadedUrls.length === 0) {
        throw new Error('No files were successfully uploaded.');
      }

      // Merge into current gallery
      const existingUrls = parseGalleryUrls(currentProject.mediaGalleryJson || currentProject.mediaGallery);
      const mergedGallery = Array.from(new Set([...existingUrls, ...uploadedUrls]));
      const nextCover = currentProject.coverImageUrl || (category === 'elevations' ? uploadedUrls[0] : null);

      // Save to database
      const updateRes = await fetch(`/api/v1/inventory/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaGallery: mergedGallery,
          ...(nextCover ? { coverImageUrl: nextCover } : {}),
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData.error || 'Failed to update project media gallery in database.');
      }

      setCurrentProject((prev: any) => ({
        ...prev,
        ...updateData.data,
        mediaGalleryJson: mergedGallery,
        ...(nextCover ? { coverImageUrl: nextCover } : {}),
      }));

      setUploadProgressMsg(`Successfully uploaded ${uploadedUrls.length} file(s) to ${category}!`);
      setTimeout(() => setUploadProgressMsg(null), 4000);
      onProjectUpdated?.(updateData.data);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadProgressMsg(`Upload failed: ${err.message || err}`);
      setTimeout(() => setUploadProgressMsg(null), 5000);
    } finally {
      setUploadingFiles(false);
      if (elevationInputRef.current) elevationInputRef.current.value = '';
      if (floorplanInputRef.current) floorplanInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imgUrl: string) => {
    if (!currentProject?.id || !imgUrl) return;

    // Two-step confirmation: first click arms the button, second click deletes.
    if (deletingImageUrl !== imgUrl) {
      setDeletingImageUrl(imgUrl);
      setTimeout(() => setDeletingImageUrl((cur) => (cur === imgUrl ? null : cur)), 4000);
      return;
    }
    setDeletingImageUrl(null);
    setUploadingFiles(true);
    setUploadProgressMsg('Removing image from project gallery...');

    try {
      const existing = parseGalleryUrls(currentProject.mediaGalleryJson || currentProject.mediaGallery);
      const nextGallery = existing.filter((item: any) => {
        const url = typeof item === 'string' ? item : (item?.url || item?.file_url || item?.secureUrl);
        return url !== imgUrl;
      });
      const nextCover = currentProject.coverImageUrl === imgUrl ? null : currentProject.coverImageUrl;
      const nextMaster = currentProject.masterPlanUrl === imgUrl ? null : currentProject.masterPlanUrl;

      const res = await fetch(`/api/v1/inventory/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaGallery: nextGallery,
          ...(currentProject.coverImageUrl === imgUrl ? { coverImageUrl: nextCover } : {}),
          ...(currentProject.masterPlanUrl === imgUrl ? { masterPlanUrl: nextMaster } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove image from project gallery.');
      }

      setCurrentProject((prev: any) => ({
        ...prev,
        ...data.data,
        mediaGalleryJson: nextGallery,
        ...(currentProject.coverImageUrl === imgUrl ? { coverImageUrl: null } : {}),
        ...(currentProject.masterPlanUrl === imgUrl ? { masterPlanUrl: null } : {}),
      }));

      setUploadProgressMsg('Image removed from project gallery.');
      setTimeout(() => setUploadProgressMsg(null), 4000);
      onProjectUpdated?.(data.data);
    } catch (err: any) {
      console.error('Delete image error:', err);
      setUploadProgressMsg(`Failed to remove image: ${err.message || err}`);
      setTimeout(() => setUploadProgressMsg(null), 5000);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSetCoverImage = async (imgUrl: string) => {
    if (!currentProject?.id || !imgUrl) return;
    try {
      const res = await fetch(`/api/v1/inventory/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: imgUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentProject((prev: any) => ({ ...prev, coverImageUrl: imgUrl }));
        setUploadProgressMsg(`Set as primary project elevation cover!`);
        setTimeout(() => setUploadProgressMsg(null), 3000);
        onProjectUpdated?.(data.data);
      }
    } catch (e) {
      console.error('Failed to set cover image:', e);
    }
  };

  const handleOneShotBrochureExtract = async (file: File) => {
    if (!currentProject?.id) return;
    setOneShotExtracting(true);
    setOneShotExtractMsg('Ingesting brochure & extracting project blueprints with AI multimodal vision…');

    try {
      let directUploadedUrl: string | null = null;

      if (file.size > 4 * 1024 * 1024) {
        try {
          const isPdf = file.type?.includes('pdf') || file.name.match(/\.pdf$/i);
          const resourceType = isPdf ? 'raw' : 'auto';
          const signRes = await fetch(
            `/api/v1/media/sign-upload?category=brochures&filename=${encodeURIComponent(file.name)}&resourceType=${resourceType}`
          );
          if (signRes.ok) {
            const signData = await signRes.json();
            if (signData.success && signData.signed) {
              const cloudAsset = await uploadToCloudinaryChunked(
                file,
                signData.signed,
                file.name
              );
              directUploadedUrl = cloudAsset.secure_url || cloudAsset.url;
            }
          }
        } catch (signErr) {
          console.warn('[1-SHOT] Cloudinary chunked direct upload notice:', signErr);
        }
      }

      let res: Response;
      if (directUploadedUrl) {
        res = await fetch('/api/v1/inventory/upload-brochure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brochureUrl: directUploadedUrl,
            filename: file.name,
            projectId: currentProject.id,
          }),
        });
      } else {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        res = await fetch('/api/v1/inventory/upload-brochure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            filename: file.name,
            mimeType: file.type || 'application/pdf',
            projectId: currentProject.id,
          }),
        });
      }

      const rawText = await res.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(`Server response error: ${rawText.slice(0, 100)}`);
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to extract brochure information.');
      }

      const updatedProjectData = json.data?.updatedProject || json.data;

      if (updatedProjectData) {
        setCurrentProject((prev: any) => ({
          ...prev,
          ...updatedProjectData,
        }));
        onProjectUpdated?.(updatedProjectData);
      }

      setOneShotExtractMsg(`Successfully extracted elevations, floor plans, and specs in 1 shot!`);
      setTimeout(() => setOneShotExtractMsg(null), 5000);
    } catch (err: any) {
      console.error('1-shot extraction error:', err);
      setOneShotExtractMsg(`Extraction failed: ${err.message || err}`);
      setTimeout(() => setOneShotExtractMsg(null), 6000);
    } finally {
      setOneShotExtracting(false);
      if (brochureExtractInputRef.current) brochureExtractInputRef.current.value = '';
    }
  };

  if (!project) return null;

  const formatINR = (val: number) => {
    if (!val && val !== 0) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const projectUnits = units.filter((u) => u.projectId === currentProject.id);

  const rawGallery = Array.isArray(currentProject.mediaGalleryJson) 
    ? currentProject.mediaGalleryJson 
    : typeof currentProject.mediaGalleryJson === 'string'
    ? JSON.parse(currentProject.mediaGalleryJson || '[]')
    : Array.isArray(currentProject.mediaGallery)
    ? currentProject.mediaGallery
    : [];

  const keyHighlights = Array.isArray(currentProject.keyHighlights)
    ? currentProject.keyHighlights
    : typeof currentProject.keyHighlights === 'string'
    ? JSON.parse(currentProject.keyHighlights || '[]')
    : [];

  const amenities = Array.isArray(currentProject.amenitiesJson)
    ? currentProject.amenitiesJson
    : typeof currentProject.amenitiesJson === 'string'
    ? JSON.parse(currentProject.amenitiesJson || '[]')
    : [];

  // Normalize gallery items into uniform { url, title, category, type, subtype, etc. } objects
  const normalizedGallery: Array<{
    url: string;
    title: string;
    category: string;
    type?: string;
    subtype?: string;
    pageNumber?: number;
    original?: boolean;
    bhk?: number;
    carpetAreaSqft?: number;
    description?: string;
  }> = [];

  rawGallery.forEach((item: any, idx: number) => {
    if (!item) return;
    if (typeof item === 'string') {
      const url = item;
      const lower = url.toLowerCase();
      let category = 'elevation';
      let title = `${currentProject.projectName} Architectural View ${idx + 1}`;
      if (lower.includes('floorplan') || lower.includes('floor_plan') || lower.includes('floor-plan') || lower.includes('blueprint')) {
        category = 'floorplan';
        title = `${currentProject.projectName} Floor Plan Blueprint`;
      } else if (lower.includes('master_plan') || lower.includes('masterplan') || lower.includes('master-plan') || lower.includes('layout')) {
        category = 'floorplan';
        title = `${currentProject.projectName} Master Layout Plan`;
      } else if (lower.includes('facade') || lower.includes('front')) {
        category = 'elevation';
        title = `${currentProject.projectName} Front Facade Elevation`;
      } else if (lower.includes('podium')) {
        category = 'elevation';
        title = `${currentProject.projectName} Podium Architecture View`;
      } else if (lower.includes('night') || lower.includes('aerial')) {
        category = 'elevation';
        title = `${currentProject.projectName} Night Aerial Elevation`;
      }
      normalizedGallery.push({ url, title, category });
    } else if (typeof item === 'object' && (item.file_url || item.url || item.secureUrl)) {
      const url = item.file_url || item.url || item.secureUrl;
      const lower = (item.title || item.category || item.asset_type || item.subtype || item.display_position || url || '').toLowerCase();
      let category = item.display_position || item.asset_type || item.category || 'elevation';
      if (lower.includes('floor') || lower.includes('plan') || lower.includes('blueprint') || lower.includes('layout')) {
        category = 'floorplan';
      }
      normalizedGallery.push({
        url,
        title: item.title || `${currentProject.projectName} Media ${idx + 1}`,
        category,
        type: item.asset_type || item.type || category,
        subtype: item.subtype,
        pageNumber: item.page_number || item.pageNumber,
        original: item.original ?? true,
        bhk: item.bhk,
        carpetAreaSqft: item.carpetAreaSqft,
        description: item.description,
      });
    }
  });

  // Build Elevation Images List
  const elevationList: Array<{ url: string; title: string; category: string; badge?: string; pageNumber?: number }> = [];

  // Add coverImageUrl
  if (currentProject.coverImageUrl && !elevationList.some(e => e.url === currentProject.coverImageUrl)) {
    elevationList.push({
      url: currentProject.coverImageUrl,
      title: `${currentProject.projectName} Primary Elevation (Cover)`,
      category: 'elevation',
      badge: 'PRIMARY ELEVATION COVER',
      pageNumber: 3,
    });
  }

  // Add elevations from gallery
  normalizedGallery
    .filter(m => m.category === 'elevation' || m.category === 'exterior' || (m.type && m.type.toLowerCase().includes('elevation')))
    .forEach((m) => {
      if (!elevationList.some(e => e.url === m.url)) {
        let badge = 'ARCHITECTURAL VIEW';
        const lower = (m.title + ' ' + m.url).toLowerCase();
        if (lower.includes('front') || lower.includes('facade')) badge = 'FRONT FACADE';
        else if (lower.includes('podium')) badge = 'PODIUM VIEW';
        else if (lower.includes('night') || lower.includes('aerial')) badge = 'NIGHT AERIAL';
        elevationList.push({
          ...m,
          badge
        });
      }
    });

  const elevationImages = elevationList.length > 0 ? elevationList : [
    { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600', title: `${currentProject.projectName} Tower Elevation`, category: 'elevation', badge: 'FRONT ELEVATION', pageNumber: 3 },
    { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600', title: `${currentProject.projectName} Facade Render`, category: 'elevation', badge: 'PODIUM FACADE', pageNumber: 3 }
  ];

  // Build Floor Plans & Blueprints List
  const floorPlanList: Array<{ url: string; title: string; category: string; badge?: string; bhk?: number; carpet?: number; pageNumber?: number }> = [];

  // Add masterPlanUrl
  if (currentProject.masterPlanUrl && !floorPlanList.some(f => f.url === currentProject.masterPlanUrl)) {
    floorPlanList.push({
      url: currentProject.masterPlanUrl,
      title: `${currentProject.projectName} Sanctioned Master Layout Plan`,
      category: 'floorplan',
      badge: 'MASTER LAYOUT PLAN',
      pageNumber: 8,
    });
  }

  // Add unit floor plans
  projectUnits.forEach((unit: any) => {
    if (unit.floorPlanUrl && !floorPlanList.some(f => f.url === unit.floorPlanUrl)) {
      floorPlanList.push({
        url: unit.floorPlanUrl,
        title: `${unit.bhk} BHK Architectural Floor Plan (${unit.carpetAreaSqft || 'RERA'} sq.ft.)`,
        category: 'floorplan',
        badge: `${unit.bhk} BHK BLUEPRINT`,
        bhk: unit.bhk,
        carpet: unit.carpetAreaSqft,
        pageNumber: 7,
      });
    }
  });

  // Add floor plans from gallery
  normalizedGallery
    .filter(m => m.category === 'floorplan' || (m.type && m.type.toLowerCase().includes('floor_plan')))
    .forEach((m) => {
      if (!floorPlanList.some(f => f.url === m.url)) {
        floorPlanList.push({
          ...m,
          badge: m.subtype ? m.subtype.replace(/_/g, ' ').toUpperCase() : 'FLOOR PLAN BLUEPRINT'
        });
      }
    });

  const floorPlanImages = floorPlanList.length > 0 ? floorPlanList : [
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600', title: `${currentProject.projectName} Master Layout Plan`, category: 'floorplan', badge: 'MASTER LAYOUT', pageNumber: 8 },
    { url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1600', title: `Typical 2 & 3 BHK Cluster Floor Plan`, category: 'floorplan', badge: 'CLUSTER PLAN', pageNumber: 7 }
  ];

  return (
    <AccessibleDialog
      open={true}
      onClose={onClose}
      titleId="project-modal-title"
      size="2xl"
      panelClassName="!p-0 overflow-hidden max-w-5xl"
    >
      <div className="relative w-full flex flex-col text-content">
        {/* Hidden Inputs for Multi-Photo and 1-Shot Brochure Ingestion */}
        <input
          ref={elevationInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => e.target.files && handleMultiImageUpload(e.target.files, 'elevations')}
        />
        <input
          ref={floorplanInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
          className="sr-only"
          onChange={(e) => e.target.files && handleMultiImageUpload(e.target.files, 'floorplans')}
        />
        <input
          ref={brochureExtractInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && handleOneShotBrochureExtract(e.target.files[0])}
        />

        {/* Header */}
        <div className="p-5 border-b border-border bg-surface-raised flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent-soft border border-accent/30 rounded-xl text-accent">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="project-modal-title" className="text-xl font-bold text-content font-display">
                  {currentProject.projectName}
                </h2>
                {unit ? (
                  <span className="badge-cobalt">
                    Unit {unit.unitNumber} ({unit.bhk} BHK • Floor {unit.floorNumber})
                  </span>
                ) : (
                  <span className="badge-cobalt">
                    {currentProject.microMarket}
                  </span>
                )}
                {(currentProject.hasOccupancyCertificate || unit?.possessionStatus === 'READY_TO_MOVE') ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success-surface text-status-success border border-status-success/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready OC (0% GST)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-warning-surface text-status-warning border border-status-warning/30 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Under-Construction (5% GST)
                  </span>
                )}
              </div>
              <p className="text-xs text-content-muted mt-1">
                Developer: <span className="text-content font-medium">{currentProject.developerName}</span> • Sub-locality: {currentProject.subLocality || 'Kharghar & Taloja Corridor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!unit && (
              <button
                type="button"
                onClick={() => brochureExtractInputRef.current?.click()}
                disabled={oneShotExtracting}
                className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold hover:bg-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="1-Shot Extract: Elevations, Floor Plans, RERA & Specs from Developer Brochure PDF"
              >
                {oneShotExtracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>AI Extracting 1-Shot…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">1-Shot Extract Brochure</span>
                  </>
                )}
              </button>
            )}

            {unit ? (
              <>
                {onEditUnit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditUnit(unit);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content text-xs font-semibold hover:bg-surface-raised flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title={`Edit Unit ${unit.unitNumber || ''}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-accent" />
                    <span className="hidden sm:inline">Edit Unit</span>
                  </button>
                )}
                {onDeleteUnit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteUnit(unit);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-status-danger/30 bg-status-danger-surface text-status-danger text-xs font-semibold hover:bg-status-danger/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title={`Delete Unit ${unit.unitNumber || ''}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete Unit</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {onEditProject && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditProject(currentProject);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border bg-surface text-content text-xs font-semibold hover:bg-surface-raised flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Edit Project Specifications"
                  >
                    <Pencil className="w-3.5 h-3.5 text-accent" />
                    <span className="hidden sm:inline">Edit Project</span>
                  </button>
                )}
                {onDeleteProject && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteProject(currentProject.id, currentProject.projectName);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-status-danger/30 bg-status-danger-surface text-status-danger text-xs font-semibold hover:bg-status-danger/10 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Delete Project & Associated Units"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete Project</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              className="p-2 rounded-lg text-content-muted hover:text-content hover:bg-surface transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-border bg-surface-subtle overflow-x-auto">
          <button
            onClick={() => setActiveTab('rera')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rera' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Government &amp; MahaRERA
          </button>
          <button
            onClick={() => setActiveTab('elevations')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'elevations' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Building2 className="w-4 h-4" /> Elevations &amp; Facades ({elevationImages.length})
          </button>
          <button
            onClick={() => setActiveTab('floorplans')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'floorplans' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Layers className="w-4 h-4" /> Floor Plans &amp; Blueprints ({floorPlanImages.length})
          </button>
          <button
            onClick={() => setActiveTab('areamatrix')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'areamatrix' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Calculator className="w-4 h-4" /> Area Matrix &amp; Units ({projectUnits.length})
          </button>
          <button
            onClick={() => setActiveTab('amenities')}
            className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'amenities' 
                ? 'border-accent text-accent font-semibold' 
                : 'border-transparent text-content-muted hover:text-content'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Amenities
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-170px)] space-y-6">
          
          {/* TAB 1: MahaRERA & Government Filing */}
          {activeTab === 'rera' && (
            <div className="space-y-6">
              <ReraVerificationBadge
                reraNumber={currentProject.reraNumber}
                projectId={currentProject.id}
                showDuplicateCheck={false}
                showPortalLink={true}
                showCopyButton={true}
              />

              {/* Official MahaRERA Certificate Download & Sync Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-accent/30 bg-surface-raised space-y-3 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0 mt-0.5 sm:mt-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-content font-display truncate">
                        Official MahaRERA Registration Certificate
                      </h4>
                      <p className="text-xs text-content-muted mt-0.5 line-clamp-2">
                        {currentProject.reraCertificateUrl
                          ? `Statutory PDF Document Linked • Valid until ${currentProject.reraValidUntil ? formatDateFull(currentProject.reraValidUntil) : 'Dec 2027'}`
                          : 'Download statutory certificate directly from MahaRERA government registry.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowFormCModal(true)}
                      className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-content border border-border text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 min-w-[120px]"
                    >
                      <Eye className="w-4 h-4 text-accent" />
                      <span>Preview Form &lsquo;C&rsquo;</span>
                    </button>

                    {currentProject.reraCertificateUrl ? (
                      <a
                        href={currentProject.reraCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold shadow-xs hover:bg-accent-hover transition-all flex items-center gap-1.5 cursor-pointer shrink-0 min-w-[120px]"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </a>
                    ) : null}

                    <button
                      type="button"
                      disabled={syncingCertificate}
                      onClick={handleSyncCertificate}
                      className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-subtle text-accent border border-accent/30 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 min-w-[130px]"
                    >
                      {syncingCertificate ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Syncing…</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{currentProject.reraCertificateUrl ? 'Re-Sync' : 'Fetch Certificate'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {certificateMsg && (
                  <div className="p-2.5 bg-status-success-surface border border-status-success/30 rounded-xl text-status-success text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{certificateMsg}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Statutory &amp; Legal Filing</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Developer Entity:</span>
                      <span className="font-medium text-content font-sans">{project.developerName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">RERA Registration ID:</span>
                      <span className="font-mono font-medium text-accent-text">{project.reraNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">CIDCO Micro-Market Node:</span>
                      <span className="font-medium text-content font-sans">{project.microMarket}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Occupancy Certificate:</span>
                      <span className={`font-medium ${project.hasOccupancyCertificate ? 'text-status-success' : 'text-status-warning'}`}>
                        {project.hasOccupancyCertificate ? 'Received (OC Valid)' : 'Under-Construction (CC Valid)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-content-muted">Applicable GST:</span>
                      <span className="font-semibold text-content font-sans">
                        {project.hasOccupancyCertificate ? '0% (Exempt on Ready OC)' : '5% Standard GST'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Construction &amp; Possession</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Commencement Date:</span>
                      <span className="font-mono text-content">
                        {project.commencementCertificateDate ? formatDateFull(project.commencementCertificateDate) : '15 Jan 2020'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Expected Possession:</span>
                      <span className="font-mono text-content">
                        {project.expectedPossessionDate ? formatDateFull(project.expectedPossessionDate) : '31 Dec 2026'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border-subtle">
                      <span className="text-content-muted">Transit Proximity:</span>
                      <span className="font-medium text-content flex items-center gap-1 font-sans">
                        <Train className="w-3.5 h-3.5 text-accent" /> {project.distanceToMetroKm || 0.65} km to Metro Line 1
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-content-muted">Standard Brokerage:</span>
                      <span className="font-mono text-accent font-bold">{project.standardCommissionPercent || 2.5}% Developer Split</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer POC Contact */}
              {project.developerSalesPocPhone && (
                <div className="p-4 rounded-xl border border-border bg-surface-raised flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent-soft text-accent">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-content-muted">Developer Sales Desk POC:</div>
                      <div className="text-sm font-bold text-content">{project.developerSalesPocName || 'Developer Sales Representative'}</div>
                      <div className="text-xs font-mono text-content-muted">{project.developerSalesPocPhone}</div>
                    </div>
                  </div>
                  <a
                    href={`tel:${project.developerSalesPocPhone}`}
                    className="btn-cobalt px-3 py-1.5 text-xs font-bold"
                  >
                    Direct Call
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Active Upload / Extraction Notification Banner */}
          {(uploadProgressMsg || oneShotExtractMsg) && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
              uploadingFiles || oneShotExtracting
                ? 'bg-accent-soft/60 border-accent/40 text-accent'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <div className="flex items-center gap-2.5">
                {uploadingFiles || oneShotExtracting ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{uploadProgressMsg || oneShotExtractMsg}</span>
              </div>
              <span className="text-[10px] font-mono opacity-80 uppercase tracking-wider">Cloud Vault</span>
            </div>
          )}

          {/* TAB 2: Elevations & Facades */}
          {activeTab === 'elevations' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-accent" /> Architectural Elevations &amp; Exterior Facades ({elevationImages.length})
                    </h3>
                  </div>
                  <p className="text-xs text-content-muted leading-relaxed">
                    High-resolution 3D building elevations, tower architecture, and aerial facade views stored via Cloudinary &amp; Local Media Vault.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => elevationInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="px-3.5 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold shadow hover:bg-accent/90 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                    title="Select and upload multiple photos at once"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Add Photos (Select Multiple)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMediaStudio(true)}
                    className="px-3.5 py-2 rounded-xl border border-border bg-surface text-content text-xs font-bold shadow-2xs hover:bg-surface-raised flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>Media Studio</span>
                  </button>
                </div>
              </div>

              {/* Elevation Image Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {elevationImages.map((img: any, idx: number) => {
                  const isCloud = img.url?.includes('cloudinary') || img.url?.includes('/uploads/');
                  const isCover = currentProject.coverImageUrl === img.url || (idx === 0 && !currentProject.coverImageUrl);

                  return (
                    <div 
                      key={idx} 
                      className={`group relative rounded-xl overflow-hidden border bg-slate-950 aspect-[16/10] cursor-pointer shadow-sm hover:border-accent hover:shadow-md transition-all flex flex-col justify-end ${
                        isCover ? 'border-accent ring-2 ring-accent/30' : 'border-border/80'
                      }`}
                      onClick={() => setSelectedImage(img.url)}
                    >
                      <img 
                        src={img.url} 
                        alt={img.title || `${currentProject.projectName} Elevation ${idx + 1}`} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 flex flex-col justify-between p-3.5 pointer-events-none">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-accent-contrast shadow-sm tracking-wide">
                              {isCover ? 'PRIMARY COVER' : (img.badge || 'ELEVATION')}
                            </span>
                            {Boolean(img.pageNumber) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-amber-300 border border-amber-500/30">
                                Page {img.pageNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 pointer-events-auto">
                            {!isCover && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetCoverImage(img.url);
                                }}
                                className="px-2 py-0.5 rounded text-[9px] font-semibold bg-black/80 hover:bg-accent text-white border border-white/20 transition-colors shadow-sm"
                                title="Set this photo as primary project cover"
                              >
                                Set Cover
                              </button>
                            )}
                            {isCloud && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-black/70 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Cloud Vault
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-white truncate pr-2">
                            {img.title || `Tower Architectural Elevation ${idx + 1}`}
                          </span>
                          <span className="p-1.5 rounded-md bg-black/60 text-white group-hover:bg-accent group-hover:text-white transition-colors shrink-0">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Photo Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files?.length) {
                    handleMultiImageUpload(e.dataTransfer.files, 'elevations');
                  }
                }}
                onClick={() => elevationInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                  isDraggingOver 
                    ? 'border-accent bg-accent-soft/40 scale-[1.01]' 
                    : 'border-border hover:border-accent/60 bg-surface-subtle/50 hover:bg-surface-raised'
                }`}
              >
                <div className="p-3 rounded-full bg-accent-soft text-accent">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-content">
                    Click to select multiple photos or drag &amp; drop here
                  </div>
                  <div className="text-[11px] text-content-muted mt-0.5">
                    Select 5, 10, or 20+ images in one go (JPG, PNG, WebP up to 25 MB each)
                  </div>
                </div>
              </div>

              {/* Architecture Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Total Towers</div>
                  <div className="text-base font-bold text-content font-mono">{currentProject.totalTowers || 1}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Storeys / Floors</div>
                  <div className="text-base font-bold text-content font-mono">{currentProject.totalFloors || 7} Storeys</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Base Price/sqft</div>
                  <div className="text-base font-bold text-accent font-mono">₹{currentProject.basePricePerSqft?.toLocaleString('en-IN') || '6,200'}</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-surface-raised text-center">
                  <div className="text-[11px] text-content-muted">Metro Station</div>
                  <div className="text-base font-bold text-content font-mono">{currentProject.distanceToMetroKm || 0.65} km</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Floor Plans & Blueprints */}
          {activeTab === 'floorplans' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-accent" /> Sanctioned Floor Plans &amp; Blueprints ({floorPlanImages.length})
                    </h3>
                  </div>
                  <p className="text-xs text-content-muted leading-relaxed">
                    Sanctioned master blueprints, typical cluster floor plans, and 2D/3D unit floor plan schematics with exact internal dimensions.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => floorplanInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="px-3.5 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold shadow hover:bg-accent/90 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                    title="Select and upload multiple floor plans at once"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Add Floor Plans (Select Multiple)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMediaStudio(true)}
                    className="px-3.5 py-2 rounded-xl border border-border bg-surface text-content text-xs font-bold shadow-2xs hover:bg-surface-raised flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>Media Studio</span>
                  </button>
                </div>
              </div>

              {/* Floor Plan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {floorPlanImages.map((img: any, idx: number) => {
                  const isCloud = img.url?.includes('cloudinary') || img.url?.includes('/uploads/');
                  return (
                    <div 
                      key={idx} 
                      className="group relative rounded-xl overflow-hidden border border-sky-500/30 bg-slate-950 aspect-[16/11] cursor-pointer shadow-sm hover:border-sky-400 hover:shadow-md transition-all flex flex-col justify-end"
                      onClick={() => setSelectedImage(img.url)}
                    >
                      <img 
                        src={img.url} 
                        alt={img.title || `${currentProject.projectName} Floor Plan ${idx + 1}`} 
                        className="absolute inset-0 w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/40 flex flex-col justify-between p-3.5 pointer-events-none">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white shadow-sm tracking-wide">
                              {img.badge || 'BLUEPRINT'}
                            </span>
                            {Boolean(img.pageNumber) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/80 text-sky-300 border border-sky-500/30">
                                Page {img.pageNumber}
                              </span>
                            )}
                          </div>
                          {isCloud && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-black/70 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-white truncate pr-2">
                            {img.title || `Sanctioned Floor Plan Blueprint ${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="p-1.5 rounded-md bg-black/60 text-white group-hover:bg-accent group-hover:text-white transition-colors"
                              title="View full size"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </span>
                            <button
                              type="button"
                              disabled={uploadingFiles}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(img.url);
                              }}
                              title={deletingImageUrl === img.url ? 'Click again to confirm removal' : 'Remove this image from project gallery'}
                              aria-label={`Remove ${img.title || 'this floor plan image'}`}
                              className={`p-1.5 rounded-md transition-colors disabled:opacity-50 cursor-pointer ${
                                deletingImageUrl === img.url
                                  ? 'bg-status-danger text-white hover:bg-status-danger/90'
                                  : 'bg-black/60 text-white hover:bg-status-danger hover:text-white'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Floor Plan Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files?.length) {
                    handleMultiImageUpload(e.dataTransfer.files, 'floorplans');
                  }
                }}
                onClick={() => floorplanInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                  isDraggingOver 
                    ? 'border-sky-500 bg-sky-500/10 scale-[1.01]' 
                    : 'border-border hover:border-sky-500/60 bg-surface-subtle/50 hover:bg-surface-raised'
                }`}
              >
                <div className="p-3 rounded-full bg-sky-500/15 text-sky-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-content">
                    Click to select multiple floor plans or drag &amp; drop here
                  </div>
                  <div className="text-[11px] text-content-muted mt-0.5">
                    Select 1 BHK, 2 BHK, 3 BHK blueprints or master layouts in one go
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Area Matrix & Units */}
          {activeTab === 'areamatrix' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-surface-raised">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-accent" /> Area Measurements &amp; Loading Matrix
                  </h3>
                  <span className="text-[11px] text-content-muted bg-surface px-2.5 py-1 rounded border border-border font-mono">
                    Carpet vs Built-Up vs Super Built-Up
                  </span>
                </div>
                <p className="text-xs text-content-muted leading-relaxed">
                  Every unit configuration adheres strictly to RERA Carpet standards, with full disclosure of Built-Up area and common area loading %.
                </p>
              </div>

              {/* Units Table with Area Matrix */}
              {projectUnits.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-xl">
                  <p className="text-xs text-content-muted">No specific child units mapped yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectUnits.map((unit) => {
                    const carpetSqft = unit.carpetAreaSqft || 650;
                    const builtUpSqft = Math.round(carpetSqft * 1.15);
                    const superBuiltUpSqft = Math.round(carpetSqft * 1.335);

                    return (
                      <div 
                        key={unit.id}
                        className="p-4 rounded-xl border border-border bg-surface-raised hover:border-accent transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-content font-mono">{unit.unitNumber}</span>
                            <span className="badge-cobalt">
                              {unit.bhk} BHK
                            </span>
                            <span className="text-xs text-content-muted font-mono">Floor {unit.floorNumber} of {unit.totalFloors}</span>
                            <span className="text-xs text-content-muted">• Facing: <strong className="text-content">{unit.facing}</strong></span>
                          </div>

                          {/* Area Breakdown Matrix */}
                          <div className="grid grid-cols-3 gap-3 bg-surface-inset p-2.5 rounded-lg border border-border text-xs font-mono">
                            <div>
                              <div className="text-[10px] text-content-muted uppercase">RERA Carpet</div>
                              <div className="font-bold text-content">{carpetSqft} sq.ft.</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-content-muted uppercase">Built-Up Area</div>
                              <div className="font-bold text-content">{builtUpSqft} sq.ft.</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-content-muted uppercase">Super Built-Up (Saleable)</div>
                              <div className="font-bold text-accent-text">{superBuiltUpSqft} sq.ft. (33.5% load)</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <div className="text-xs text-content-muted font-mono">All-in Statutory Cost</div>
                            <div className="text-base font-bold text-accent font-mono">
                              {formatINR(unit.allInTotalCost || unit.agreementValue)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {onSelectUnitForCalc && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectUnitForCalc(unit);
                                  onClose();
                                }}
                                className="btn-secondary px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Open cost & EMI calculator"
                              >
                                <Calculator className="w-3.5 h-3.5 text-accent" />
                                <span>Breakdown</span>
                              </button>
                            )}
                            {onEditUnit && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onEditUnit(unit);
                                }}
                                className="btn-secondary p-1.5 text-xs font-medium rounded-lg flex items-center justify-center cursor-pointer shadow-2xs"
                                title={`Edit Unit ${unit.unitNumber || ''}`}
                              >
                                <Pencil className="w-3.5 h-3.5 text-accent" />
                              </button>
                            )}
                            {onDeleteUnit && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteUnit(unit);
                                }}
                                className="p-1.5 text-xs font-medium rounded-lg border border-status-danger/30 text-status-danger bg-status-danger-surface hover:bg-status-danger/10 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                title={`Delete Unit ${unit.unitNumber || ''}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Amenities & Highlights */}
          {activeTab === 'amenities' && (
            <div className="space-y-6">
              {keyHighlights.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Key Project Highlights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {keyHighlights.map((hl: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-content">
                        <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {amenities.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-3">
                  <h3 className="text-xs font-bold text-content uppercase tracking-wider">Lifestyle &amp; Recreational Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-content flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-content-muted font-mono">
            ZamZam Verified Real Estate Intelligence • Kharghar &amp; Taloja Corridor
          </div>
          <div className="flex items-center gap-2">
            {unit ? (
              onEditUnit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditUnit(unit);
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-accent" />
                  <span>Edit Unit Specs</span>
                </button>
              )
            ) : (
              onEditProject && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProject(currentProject);
                  }}
                  className="btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-accent" />
                  <span>Edit Specs</span>
                </button>
              )
            )}
            <button
              type="button"
              data-dialog-close
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </div>

      {/* High-Resolution Media Lightbox Modal */}
      {selectedImage && (
        <AccessibleDialog
          open={true}
          onClose={() => setSelectedImage(null)}
          titleId="lightbox-title"
          size="2xl"
          panelClassName="!p-4 bg-surface border-border max-w-5xl"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 id="lightbox-title" className="text-sm font-bold text-content flex items-center gap-2 font-display">
                <Maximize2 className="w-4 h-4 text-accent shrink-0" />
                <span className="truncate">High-Resolution Architectural View • {currentProject.projectName}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-3.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover active:bg-accent-active text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Open Full Asset</span>
                </a>
                <button
                  type="button"
                  data-dialog-close
                  onClick={() => setSelectedImage(null)}
                  className="p-1.5 rounded-lg text-content-muted hover:text-content hover:bg-surface-raised transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-auto rounded-xl bg-surface-subtle border border-border/60 p-2">
              <img
                src={selectedImage}
                alt="High resolution render"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </AccessibleDialog>
      )}

      {/* Form C Interactive Preview Modal */}
      {currentProject && (
        <MahaReraCertificateModal
          open={showFormCModal}
          onClose={() => setShowFormCModal(false)}
          projectData={{
            reraNumber: currentProject.reraNumber || 'P52000079818',
            projectName: currentProject.projectName || 'CITY AVENUE',
            developerName: currentProject.developerName || 'City Space',
            promoterName: currentProject.promoterName || currentProject.developerName || 'City Space',
            address: currentProject.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            plotDetails: currentProject.plotDetails || currentProject.address || 'PLOT NO 12D, SECTOR-24 at Taloja Panchnad , Panvel, Raigarh, 410208',
            registeredOffice: currentProject.registeredOffice || 'Tehsil: Panvel, District: Raigarh, Pin: 410210',
            registrationDate: currentProject.registrationDate ? String(currentProject.registrationDate) : '27/03/2025',
            validUntil: currentProject.validUntil ? String(currentProject.validUntil) : (currentProject.reraValidUntil ? formatDateFull(currentProject.reraValidUntil) : '31/12/2028'),
            signatoryName: currentProject.signatoryName || 'Prakash Kaluram Sabale',
            signatoryDate: currentProject.signatoryDate || '3/27/2025 3:57:36 PM',
            certificateUrl: currentProject.reraCertificateUrl || (currentProject.reraNumber === 'P52000079818' ? '/uploads/rera-certificates/MahaRERA_P52000079818_city_avenue_Certificate.pdf' : undefined),
            originalImageUrl: currentProject.originalDocumentUrl || (currentProject.reraNumber === 'P52000079818' ? '/images/original-certificates/P52000079818.png' : undefined),
            isOriginalScannedDocument: true,
          }}
        />
      )}

      {/* Elevation, Floor Plan & Media Studio Modal */}
      {showMediaStudio && currentProject && (
        <ProjectMediaStudioModal
          open={showMediaStudio}
          onClose={() => setShowMediaStudio(false)}
          project={{
            ...currentProject,
            units: projectUnits,
          }}
          onUpdated={async () => {
            try {
              const res = await fetch(`/api/v1/inventory/projects`);
              if (res.ok) {
                const data = await res.json();
                const updated = (data.data || []).find((p: any) => p.id === currentProject.id);
                if (updated) {
                  setCurrentProject(updated);
                }
              }
            } catch (e) {
              console.warn('Failed to refresh project data:', e);
            }
          }}
        />
      )}
    </AccessibleDialog>
  );
}
